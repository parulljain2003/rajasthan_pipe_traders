"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AdminProduct } from "../types";

interface Props {
  product: AdminProduct;
  index: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  skip: number;
}

export function SortableProductRow({
  product,
  index,
  onEdit,
  onDelete,
  skip,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? "var(--admin-bg-hover, #f8fafc)" : undefined,
    zIndex: isDragging ? 1 : undefined,
    position: "relative" as const,
  };

  return (
    <tr ref={setNodeRef} style={style} id={`admin-row-${product._id}`}>
      <td {...attributes} {...listeners} style={{ cursor: "grab", width: "40px" }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="muted"
        >
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </td>
      <td>{skip + index + 1}</td>
      <td>
        {product.image ? (
          <img src={product.image} alt="" className="admin-thumb" />
        ) : (
          "—"
        )}
      </td>
      <td>
        <code style={{ fontSize: "0.8rem" }}>{product.sku ?? "—"}</code>
      </td>
      <td>{product.name}</td>
      <td>{product.category?.name ?? "—"}</td>
      <td>{product.sortOrder ?? 0}</td>
      <td>{product.productKind}</td>
      <td>₹{product.pricing?.priceWithGst ?? "—"}</td>
      <td>{product.isActive ? "Yes" : "No"}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          style={{ marginRight: 6 }}
          onClick={() => onEdit(product._id)}
        >
          Edit
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-danger"
          onClick={() => onDelete(product._id)}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
