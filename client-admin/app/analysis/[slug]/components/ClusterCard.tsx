"use client";

import type { ClusterWithChildren } from "./types";
import type { Result } from "@/type";

type Props = {
  group: ClusterWithChildren;
  result: Result;
  color?: string;
};

export default function ClusterCard({ group, result, color = "#2a4365" }: Props) {
  const args = result.arguments.filter((a) =>
    a.cluster_ids?.includes(group.id),
  );

  return (
    <div
      style={{
        border: "1px solid #ccc",
        marginBottom: "1rem",
        padding: "1rem",
        background: "#f9f9f9",
      }}
    >
      <div style={{ color }}>
        <strong>{group.label}</strong>
        <span style={{ marginLeft: "1em", fontSize: "0.9em", color: "#555" }}>
          {group.value}件
        </span>
      </div>
      <div style={{ marginLeft: "1em", color: "#444" }}>{group.takeaway}</div>

      <details style={{ marginTop: "0.5rem" }}>
        <summary style={{ cursor: "pointer", color: "#0070f3" }}>
          意見一覧を表示
        </summary>
        <ul style={{ paddingLeft: "1rem", marginTop: "0.5rem" }}>
          {args.map((a) => (
            <li key={a.arg_id}>{a.argument}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
