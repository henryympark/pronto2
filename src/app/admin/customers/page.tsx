"use client";

import { useState } from "react";
import { Customer } from "@/types";
import { Loader2, AlertCircle } from "lucide-react";
import { useCustomerData } from "./hooks/useCustomerData";
import { useCustomerFilters } from "./hooks/useCustomerFilters";
import CustomerFilters from "./components/CustomerFilters";
import CustomerTable from "./components/CustomerTable";
import CustomerDetailModal from "./components/CustomerDetailModal";
import AddCustomerModal from "./components/AddCustomerModal";
import CustomerEditModal from "./components/CustomerEditModal";

export default function AdminCustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);

  const {
    allCustomers, loading, error, availableTags, customerTags,
    createCustomer, updateCustomer, grantRewards, addTagToCustomer, removeTagFromCustomer,
  } = useCustomerData();

  const {
    filters, filteredCustomers, updateActivity, updateFrequency, updateCustomerType,
    updateStatus, updateSelectedTagIds, updateSearchQuery, resetFilters,
    totalCount, filteredCount, isSearching,
  } = useCustomerFilters(allCustomers);

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerDetailOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditModalOpen(true);
  };

  const handleAddCustomer = () => setAddCustomerDialogOpen(true);

  const handleGrantRewards = async (customerId: string, type: 'coupon' | 'time', minutes: number) => {
    setGrantLoading(true);
    try {
      return await grantRewards(customerId, type, minutes);
    } finally {
      setGrantLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>

      <CustomerFilters
        filters={filters}
        onUpdateActivity={updateActivity}
        onUpdateFrequency={updateFrequency}
        onUpdateCustomerType={updateCustomerType}
        onUpdateStatus={updateStatus}
        onUpdateSelectedTagIds={updateSelectedTagIds}
        onUpdateSearchQuery={updateSearchQuery}
        onResetFilters={resetFilters}
        totalCount={totalCount}
        filteredCount={filteredCount}
        isSearching={isSearching}
      />

      <CustomerTable
        customers={filteredCustomers}
        searchQuery={filters.searchQuery}
        onViewCustomer={handleViewCustomer}
        onEditCustomer={handleEditCustomer}
        onAddCustomer={handleAddCustomer}
      />

      <CustomerDetailModal
        customer={selectedCustomer}
        open={customerDetailOpen}
        onClose={() => setCustomerDetailOpen(false)}
        availableTags={availableTags}
        customerTags={customerTags}
        onAddTag={addTagToCustomer}
        onRemoveTag={removeTagFromCustomer}
        onGrantRewards={handleGrantRewards}
        grantLoading={grantLoading}
      />

      <AddCustomerModal
        open={addCustomerDialogOpen}
        onClose={() => setAddCustomerDialogOpen(false)}
        onCreateCustomer={createCustomer}
      />

      <CustomerEditModal
        customer={editingCustomer}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdateCustomer={updateCustomer}
      />
    </div>
  );
} 