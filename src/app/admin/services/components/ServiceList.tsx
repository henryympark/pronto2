"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_hour: number;
  location: string;
  image_url: string;
  notice?: string;
  refund_policy?: string;
  average_rating?: number;
  review_count?: number;
};

type ServiceListProps = {
  services: Service[];
  selectedService: Service | null;
  onServiceChange: (serviceId: string) => void;
};

export function ServiceList({ services, selectedService, onServiceChange }: ServiceListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">서비스 목록</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => onServiceChange(service.id)}
              className={`w-full text-left p-3 rounded-md border transition-colors ${
                selectedService?.id === service.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
            >
              <div className="font-medium">{service.name}</div>
              <div className="text-sm opacity-75">
                {service.price_per_hour?.toLocaleString()}원/시간
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 