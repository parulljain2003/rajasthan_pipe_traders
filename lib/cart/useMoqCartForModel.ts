"use client";

import { useCallback, useMemo } from "react";
import { useCartWishlist } from "@/app/context/CartWishlistContext";
import type { AddCartItemInput } from "@/app/context/CartWishlistContext";
import { cartLineMatches } from "@/lib/cart/matchCartLine";
import { moqStepsFromPacketQty, packetsFromMoqSteps } from "@/lib/cart/packetLine";
import type { ListingMoqCartModel } from "@/lib/cart/listingMoqModel";

function basePayload(m: ListingMoqCartModel, orderMode: "packets" | "master_bag"): AddCartItemInput {
  return {
    productId: m.productId,
    mongoProductId: m.mongoProductId,
    categoryMongoId: m.categoryMongoId,
    productSlug: m.productSlug,
    productImage: m.productImage,
    productName: m.productName,
    brand: m.brand,
    category: m.category,
    sellerId: m.sellerId,
    sellerName: m.sellerName,
    size: m.size,
    pricePerUnit: m.pricePerUnit,
    basicPricePerUnit: m.basicPricePerUnit,
    qtyPerBag: m.qtyPerBag,
    pcsPerPacket: m.pcsPerPacket,
    orderMode,
  };
}

export function useMoqCartForModel(model: ListingMoqCartModel) {
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCartWishlist();

  const qpb = Math.max(0, Math.floor(Number(model.qtyPerBag) || 0));
  const hasBulk = qpb > 0;

  const bagQtyRaw = useMemo(() => {
    const line = cartItems.find((ci) =>
      cartLineMatches(ci, model.productId, model.size, model.sellerId, "master_bag")
    );
    return line ? Math.max(0, Math.floor(Number(line.quantity) || 0)) : 0;
  }, [cartItems, model.productId, model.size, model.sellerId]);

  const pktQtyRaw = useMemo(() => {
    const line = cartItems.find((ci) =>
      cartLineMatches(ci, model.productId, model.size, model.sellerId, "packets")
    );
    return line ? Math.max(0, Math.floor(Number(line.quantity) || 0)) : 0;
  }, [cartItems, model.productId, model.size, model.sellerId]);

  const pktQty = hasBulk && qpb > 0
    ? (pktQtyRaw > 0 ? pktQtyRaw : bagQtyRaw * qpb)
    : pktQtyRaw;
  const bagQty = hasBulk && qpb > 0 ? Math.floor(pktQty / qpb + 1e-9) : bagQtyRaw;
  const pktSteps = hasBulk ? moqStepsFromPacketQty(pktQty, qpb) : pktQty;

  const setBagTarget = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (hasBulk && qpb > 0) {
        const nextPkt = next * qpb;
        if (nextPkt === 0) {
          removeFromCart(model.productId, model.size, model.sellerId, "packets");
          removeFromCart(model.productId, model.size, model.sellerId, "master_bag");
          return;
        }
        if (pktQtyRaw === 0) {
          addToCart(basePayload(model, "packets"), nextPkt);
        } else {
          updateQuantity(model.productId, model.size, nextPkt, model.sellerId, "packets");
        }
        if (bagQtyRaw > 0) {
          removeFromCart(model.productId, model.size, model.sellerId, "master_bag");
        }
        return;
      }
      if (next === 0) {
        removeFromCart(model.productId, model.size, model.sellerId, "master_bag");
        return;
      }
      if (bagQtyRaw === 0) {
        addToCart(basePayload(model, "master_bag"), next);
      } else {
        updateQuantity(model.productId, model.size, next, model.sellerId, "master_bag");
      }
    },
    [model, hasBulk, qpb, bagQtyRaw, pktQtyRaw, addToCart, updateQuantity, removeFromCart]
  );

  const setPacketTarget = useCallback(
    (nextPkt: number) => {
      if (nextPkt < 0) return;
      if (hasBulk && qpb > 0) {
        if (nextPkt === 0) {
          removeFromCart(model.productId, model.size, model.sellerId, "packets");
          removeFromCart(model.productId, model.size, model.sellerId, "master_bag");
          return;
        }
        if (pktQtyRaw === 0) {
          addToCart(basePayload(model, "packets"), nextPkt);
        } else {
          updateQuantity(model.productId, model.size, nextPkt, model.sellerId, "packets");
        }
        if (bagQtyRaw > 0) {
          removeFromCart(model.productId, model.size, model.sellerId, "master_bag");
        }
        return;
      }
      if (nextPkt === 0) {
        removeFromCart(model.productId, model.size, model.sellerId, "packets");
        return;
      }
      if (pktQtyRaw === 0) {
        addToCart(basePayload(model, "packets"), nextPkt);
      } else {
        updateQuantity(model.productId, model.size, nextPkt, model.sellerId, "packets");
      }
    },
    [model, hasBulk, qpb, pktQtyRaw, bagQtyRaw, addToCart, updateQuantity, removeFromCart]
  );

  const onBagDelta = useCallback((delta: number) => {
    setBagTarget(bagQty + delta);
  }, [bagQty, setBagTarget]);

  const onPacketDelta = useCallback(
    (delta: number) => {
      if (!hasBulk) {
        setPacketTarget(pktQty + delta);
        return;
      }
      setPacketTarget(Math.max(0, pktQty + delta * qpb));
    },
    [hasBulk, pktQty, qpb, setPacketTarget]
  );

  const setPacketStepsFromInput = useCallback(
    (n: number) => {
      if (Number.isNaN(n) || n < 0) return;
      if (!hasBulk) {
        setPacketTarget(n);
        return;
      }
      setPacketTarget(packetsFromMoqSteps(n, qpb));
    },
    [hasBulk, qpb, setPacketTarget]
  );

  return {
    hasBulk,
    qpb,
    bagQty,
    pktQty,
    pktSteps,
    setBagTarget,
    setPacketTarget,
    onBagDelta,
    onPacketDelta,
    setPacketStepsFromInput,
  };
}
