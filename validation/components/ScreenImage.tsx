"use client";

import { useEffect, useState } from "react";
import { getImage } from "@/lib/images";

export function ScreenImage({
  imageId,
  className,
}: {
  imageId: string;
  className: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    getImage(imageId).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (!url) {
    return <div className={`bg-line/40 ${className}`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob: URLs aren't supported by next/image
    <img src={url} alt="" className={`object-cover border border-line ${className}`} />
  );
}
