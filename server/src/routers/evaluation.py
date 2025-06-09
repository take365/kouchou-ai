import json
from enum import Enum
from fastapi import APIRouter, Depends, HTTPException, Security, Body
from fastapi.responses import PlainTextResponse
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel

from src.config import settings
from src.services.evaluation_consistency_llm import load_cluster_data, format_batch_prompt, evaluate_clusters, save_results
from src.services.evaluate_silhouette_score import compute_silhouette
from src.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger()

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)

async def verify_admin_api_key(api_key: str = Security(api_key_header)):
    if not api_key or api_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


@router.get("/admin/evaluation/{slug}")
async def get_evaluation_result(slug: str, api_key: str = Depends(verify_admin_api_key)):
    result_path = settings.REPORT_DIR / slug / "evaluation_consistency_llm.json"
    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Evaluation result not found")

    try:
        with open(result_path, encoding="utf-8") as f:
            result_data = json.load(f)
        return result_data
    except Exception as e:
        logger.error(f"Failed to load evaluation result: {e}")
        raise HTTPException(status_code=500, detail="Failed to read evaluation result")


@router.get("/admin/evaluation/{slug}/prompt", response_class=PlainTextResponse)
async def get_prompt_text(slug: str, level: int = 1, sampling_rate: float = 1.0, api_key: str = Depends(verify_admin_api_key)):
    try:
        cluster_data = load_cluster_data(dataset=slug, level=level, sampling_rate=sampling_rate)
        prompt = format_batch_prompt(cluster_data)
        return prompt
    except Exception as e:
        logger.error(f"Failed to generate prompt: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate prompt")


class EvaluationRequest(BaseModel):
    dataset: str
    level: int = 1
    sampling_rate: float = 1.0
    model: str = "gpt-4o-mini"


@router.post("/admin/evaluate/consistency")
async def evaluate_consistency(request: EvaluationRequest, api_key: str = Depends(verify_admin_api_key)):
    try:
        cluster_data = load_cluster_data(request.dataset, request.level, request.sampling_rate)
        results = evaluate_clusters(cluster_data, mode="api", model=request.model)
        save_results(results, request.dataset)
        return {"status": "success", "evaluated": len(results), "dataset": request.dataset}
    except Exception as e:
        logger.error(f"Failed to evaluate consistency: {e}")
        raise HTTPException(status_code=500, detail="Failed to evaluate consistency")


class SourceEnum(str, Enum):
    embedding = "embedding"
    umap = "umap"


@router.post("/admin/evaluate/silhouette")
async def run_silhouette(
    dataset: str = Body(...),
    level: int = Body(1),
    source: SourceEnum = Body(SourceEnum.umap),
    api_key: str = Depends(verify_admin_api_key),
):
    cluster_scores, point_scores, overall = compute_silhouette(dataset, level, source)
    if cluster_scores is None:
        logger.warning(f"スキップされました: {dataset} - {source}")
        raise HTTPException(status_code=400, detail="クラスタ数が2未満のため評価できません")

    base = settings.REPORT_DIR / dataset / f"silhouette_{source}_level{level}"
    with open(base.with_name(base.name + "_clusters.json"), "w", encoding="utf-8") as f:
        json.dump({
            "level": level,
            "source": source,
            "clusters": cluster_scores,
            "overall_avg": overall
        }, f, indent=2, ensure_ascii=False)
    with open(base.with_name(base.name + "_points.json"), "w", encoding="utf-8") as f:
        json.dump(point_scores, f, indent=2, ensure_ascii=False)

    return {"status": "success", "evaluated": source}


@router.get("/admin/evaluation/{slug}/silhouette/{source}/level{level}/clusters")
async def get_silhouette_cluster_scores(
    slug: str,
    source: SourceEnum,
    level: int,
    api_key: str = Depends(verify_admin_api_key)
):
    path = settings.REPORT_DIR / slug / f"silhouette_{source}_level{level}_clusters.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Cluster silhouette result not found")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@router.get("/admin/evaluation/{slug}/silhouette/{source}/level{level}/points")
async def get_silhouette_point_scores(
    slug: str,
    source: SourceEnum,
    level: int,
    api_key: str = Depends(verify_admin_api_key)
):
    path = settings.REPORT_DIR / slug / f"silhouette_{source}_level{level}_points.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Point silhouette result not found")
    with open(path, encoding="utf-8") as f:
        return json.load(f)
