-- Create reward_history table for tracking customer reward minutes
CREATE TABLE IF NOT EXISTS public.reward_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('review_bonus', 'admin_grant', 'event_participation', 'referral_bonus', 'usage_deduction')),
    reward_minutes INTEGER NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reward_history_customer_id ON public.reward_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_reward_type ON public.reward_history(reward_type);
CREATE INDEX IF NOT EXISTS idx_reward_history_created_at ON public.reward_history(created_at);
CREATE INDEX IF NOT EXISTS idx_reward_history_reference_id ON public.reward_history(reference_id);

-- Enable Row Level Security
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own reward history
CREATE POLICY "Users can view own reward history" ON public.reward_history
    FOR SELECT USING (auth.uid() = customer_id);

-- Policy: Admin can view all reward history (assuming admin role exists)
CREATE POLICY "Admin can view all reward history" ON public.reward_history
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Policy: Only system/admin can insert reward history
CREATE POLICY "System can insert reward history" ON public.reward_history
    FOR INSERT WITH CHECK (true);

-- Policy: Only system/admin can update reward history
CREATE POLICY "System can update reward history" ON public.reward_history
    FOR UPDATE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_reward_history_updated_at 
    BEFORE UPDATE ON public.reward_history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update customer total_reward_minutes
CREATE OR REPLACE FUNCTION update_customer_reward_minutes()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the customer's total_reward_minutes based on reward_history
    UPDATE public.customers 
    SET total_reward_minutes = (
        SELECT COALESCE(SUM(reward_minutes), 0) 
        FROM public.reward_history 
        WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    )
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger to update customer total_reward_minutes on reward_history changes
CREATE TRIGGER update_customer_total_reward_minutes_on_insert
    AFTER INSERT ON public.reward_history
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_reward_minutes();

CREATE TRIGGER update_customer_total_reward_minutes_on_update
    AFTER UPDATE ON public.reward_history
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_reward_minutes();

CREATE TRIGGER update_customer_total_reward_minutes_on_delete
    AFTER DELETE ON public.reward_history
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_reward_minutes();

-- Insert some sample data for testing (optional)
-- INSERT INTO public.reward_history (customer_id, reward_type, reward_minutes, description, reference_id) VALUES
-- (uuid_generate_v4(), 'review_bonus', 30, '서비스 리뷰 작성 보상', uuid_generate_v4()),
-- (uuid_generate_v4(), 'admin_grant', 60, '관리자 직접 부여 - 특별 이벤트', NULL),
-- (uuid_generate_v4(), 'event_participation', 45, '신년 이벤트 참여 보상', uuid_generate_v4());

-- Add comment for documentation
COMMENT ON TABLE public.reward_history IS 'Table to track customer reward minutes history including earning and usage';
COMMENT ON COLUMN public.reward_history.reward_type IS 'Type of reward: review_bonus, admin_grant, event_participation, referral_bonus, usage_deduction';
COMMENT ON COLUMN public.reward_history.reward_minutes IS 'Number of minutes earned or deducted (negative for usage)';
COMMENT ON COLUMN public.reward_history.description IS 'Human readable description of the reward transaction';
COMMENT ON COLUMN public.reward_history.reference_id IS 'Optional reference to related entity (review_id, event_id, etc.)'; 