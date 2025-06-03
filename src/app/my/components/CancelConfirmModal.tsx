"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface CancelConfirmModalProps {
  isOpen: boolean;
  isCancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelConfirmModal({
  isOpen,
  isCancelling,
  onClose,
  onConfirm
}: CancelConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>예약 취소</DialogTitle>
          <DialogDescription>
            정말로 예약을 취소하시겠습니까? 취소 정책에 따라 환불 금액이 달라질 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCancelling}>
            아니오
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isCancelling}>
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                취소 중...
              </>
            ) : (
              '예약 취소'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 