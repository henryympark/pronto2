"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCreateCustomer: (customerData: {
    email: string;
    nickname: string;
    phone: string;
    password: string;
  }) => Promise<boolean>;
  loading?: boolean;
}

export default function AddCustomerModal({
  open,
  onClose,
  onCreateCustomer,
  loading = false,
}: AddCustomerModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    nickname: "",
    phone: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await onCreateCustomer(formData);
    if (success) {
      setFormData({
        email: "",
        nickname: "",
        phone: "",
        password: ""
      });
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      email: "",
      nickname: "",
      phone: "",
      password: ""
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 고객 등록</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="example@email.com"
              required
            />
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
            <Label htmlFor="password">임시 비밀번호 *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="최소 6자리"
              minLength={6}
              required
            />
            <p className="text-sm text-gray-500">
              고객이 첫 로그인 시 비밀번호를 변경하도록 안내해주세요.
            </p>
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
              disabled={loading || !formData.email || !formData.password}
            >
              {loading ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 