"use client";

import Image from "next/image";
import { DEFAULT_IMAGES } from "@/constants/images";

interface ServiceImageGalleryProps {
  imageUrl?: string;
  serviceName: string;
}

export default function ServiceImageGallery({ imageUrl, serviceName }: ServiceImageGalleryProps) {
  return (
    <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-pronto-gray-100">
      <Image 
        src={imageUrl || DEFAULT_IMAGES.SERVICE_DEFAULT}
        alt={`${serviceName} 대표 이미지`}
        fill
        className="object-cover"
        priority
      />
    </div>
  );
} 