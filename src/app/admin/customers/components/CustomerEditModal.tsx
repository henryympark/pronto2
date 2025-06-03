"use client";

import { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustomerEditModalProps {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onUpdateCustomer: (customerId: string, updates: {
    nickname?: string;
    phone?: string;
    company_name?: string;
  }) => Promise<boolean>;
  loading?: boolean;
}

export default function CustomerEditModal({
  customer,
  open,
  onClose,
  onUpdateCustomer,
  loading = false,
}: CustomerEditModalProps) {
  const [formData, setFormData] = useState({
    nickname: "",
    phone: "",
    company_name: "",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        nickname: customer.nickname || "",
        phone: customer.phone || "",
        company_name: customer.company_name || "",
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer) return;
    
    const success = await onUpdateCustomer(customer.id, formData);
    if (success) {
      onClose();
    }
  };

  const handleClose = () => {
    if (customer) {
      setFormData({
        nickname: customer.nickname || "",
        phone: customer.phone || "",
        company_name: customer.company_name || "",
      });
    }
    onClose();
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>고객 정보 수정</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>이메일</Label>
            <Input
              value={customer.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-sm text-gray-500">이메일은 변경할 수 없습니다.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              placeholder="닉네임을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="010-1234-5678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">회사명</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="회사명을 입력하세요"
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? "수정 중..." : "수정"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 