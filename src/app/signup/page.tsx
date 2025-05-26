"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createClient$ } from "@/lib/supabase";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient$();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 휴대폰 인증 관련 상태
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  
  // 약관 동의 상태
  const [agreements, setAgreements] = useState({
    all: false,
    age: false,
    terms: false,
    marketing: false,
    notification: false,
  });
  
  // URL 파라미터 확인하여 테스트 계정 정보 자동 채우기
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isTest = searchParams.get('test') === 'true';
    
    if (isTest) {
      setFormData({
        email: "test@pronto.com",
        password: "pronto1!",
        confirmPassword: "pronto1!",
        name: "테스트 사용자",
        phone: "01012345678",
      });
      
      setAgreements({
        all: true,
        age: true,
        terms: true,
        marketing: true,
        notification: true,
      });
      
      setPhoneVerified(true);
    }
  }, []);
  
  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 실시간 유효성 검사 (해당 필드의 에러만 지움)
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // 휴대폰 번호 변경 시 인증 상태 초기화
    if (name === 'phone') {
      setPhoneVerified(false);
      setShowVerificationInput(false);
    }
  };
  
  // 약관 동의 변경 핸들러
  const handleAgreementChange = (name: keyof typeof agreements) => {
    if (name === 'all') {
      const newValue = !agreements.all;
      setAgreements({
        all: newValue,
        age: newValue,
        terms: newValue,
        marketing: newValue,
        notification: newValue,
      });
    } else {
      const newAgreements = {
        ...agreements,
        [name]: !agreements[name],
      };
      
      // 모든 항목이 체크되었는지 확인하여 전체 동의 상태 업데이트
      const allChecked = 
        newAgreements.age && 
        newAgreements.terms && 
        newAgreements.marketing && 
        newAgreements.notification;
      
      setAgreements({
        ...newAgreements,
        all: allChecked,
      });
    }
  };
  
  // 휴대폰 번호 형식 검사
  const validatePhoneNumber = (phone: string) => {
    // 숫자만 추출
    const phoneDigits = phone.replace(/\D/g, '');
    return /^01[0-9]{8,9}$/.test(phoneDigits);
  };
  
  // 휴대폰 인증 코드 발송
  const sendVerificationCode = async () => {
    // 휴대폰 번호 형식 검사
    if (!validatePhoneNumber(formData.phone)) {
      setErrors((prev) => ({
        ...prev,
        phone: "유효한 휴대폰 번호를 입력해주세요. (예: 01012345678)"
      }));
      return;
    }
    
    setIsVerifyingPhone(true);
    
    try {
      // Supabase Function을 통해 휴대폰 인증 코드 발송
      const { data, error } = await supabase.functions.invoke('send-phone-verification', {
        body: { phone: formData.phone.replace(/\D/g, '') }
      });
      
      if (error) throw error;
      
      setShowVerificationInput(true);
      toast({
        title: "인증 코드 발송 완료",
        description: "입력하신 휴대폰 번호로 인증 코드가 발송되었습니다.",
      });
    } catch (error: any) {
      console.error("인증 코드 발송 오류:", error);
      toast({
        title: "인증 코드 발송 실패",
        description: error.message || "인증 코드 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingPhone(false);
    }
  };
  
  // 인증 코드 확인
  const verifyPhoneCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setErrors((prev) => ({
        ...prev,
        verificationCode: "유효한 인증 코드를 입력해주세요."
      }));
      return;
    }
    
    setIsVerifyingPhone(true);
    
    try {
      // Supabase Function을 통해 인증 코드 확인
      const { data, error } = await supabase.functions.invoke('verify-phone-code', {
        body: { 
          phone: formData.phone.replace(/\D/g, ''),
          code: verificationCode
        }
      });
      
      if (error) throw error;
      
      setPhoneVerified(true);
      toast({
        title: "휴대폰 인증 성공",
        description: "휴대폰 번호 인증이 완료되었습니다.",
      });
    } catch (error: any) {
      console.error("인증 코드 확인 오류:", error);
      toast({
        title: "인증 실패",
        description: error.message || "인증 코드가 일치하지 않습니다.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingPhone(false);
    }
  };
  
  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // 이메일 검사
    if (!formData.email) {
      newErrors.email = "이메일을 입력해주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "유효한 이메일 형식이 아닙니다.";
    }
    
    // 비밀번호 검사 (8자 이상, 영문/숫자/특수문자 조합)
    if (!formData.password) {
      newErrors.password = "비밀번호를 입력해주세요.";
    } else if (formData.password.length < 8) {
      newErrors.password = "비밀번호는 8자 이상이어야 합니다.";
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(formData.password)) {
      newErrors.password = "비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.";
    }
    
    // 비밀번호 확인
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }
    
    // 이름 검사
    if (!formData.name) {
      newErrors.name = "이름을 입력해주세요.";
    }
    
    // 휴대폰 번호 검사
    if (!formData.phone) {
      newErrors.phone = "휴대폰 번호를 입력해주세요.";
    } else if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = "유효한 휴대폰 번호 형식이 아닙니다. (예: 01012345678)";
    }
    
    // 테스트 계정(test@pronto.com) 자동 인증 처리
    if (formData.email === 'test@pronto.com') {
      setPhoneVerified(true);
    }
    
    // 필수 약관 동의 검사
    if (!agreements.age) {
      newErrors.age = "만 14세 이상 확인이 필요합니다.";
    }
    
    if (!agreements.terms) {
      newErrors.terms = "이용약관 동의가 필요합니다.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 회원가입 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 테스트 계정인 경우 특별 처리
      const isTestAccount = formData.email === 'test@pronto.com';
      
      // 테스트 계정인 경우 먼저 로그인 시도
      if (isTestAccount) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        // 로그인 성공 시 메인 페이지로 이동
        if (!loginError && loginData.user) {
          toast({
            title: "테스트 계정 로그인 성공!",
            description: "테스트 계정으로 로그인되었습니다.",
          });
          
          router.push("/");
          setIsSubmitting(false);
          return;
        }
        
        // 로그인 실패 시 (계정이 없거나 비밀번호가 다른 경우) 회원가입 진행
        console.log("테스트 계정 로그인 실패, 회원가입 진행:", loginError);
      }
      
      // Supabase Auth로 회원가입
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name,
            phone: formData.phone.replace(/\D/g, ''),
            marketing_agree: agreements.marketing,
            notification_agree: agreements.notification,
          },
        },
      });
      
      if (error) throw error;
      
      // 사용자 정보 저장 (customers 테이블)
      await supabase.from('customers').insert({
        id: data.user?.id || '',
        email: formData.email.toLowerCase(),
        auth_provider: 'email',
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      // 일반 계정 성공 메시지 및 로그인 페이지로 이동
      toast({
        title: "회원가입 성공!",
        description: "이메일로 발송된 인증 링크를 클릭하여 가입을 완료해주세요.",
      });
      
      router.push("/auth/login?signup=success");
      
    } catch (error: any) {
      console.error("회원가입 에러:", error);
      toast({
        title: "회원가입 실패",
        description: error.message || "회원가입 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="mx-auto max-w-md space-y-8 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">회원가입</h1>
        <p className="mt-2 text-sm text-pronto-gray-500">
          프론토 서비스를 이용하기 위한 계정을 만들어주세요
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 이메일 입력 */}
        <div className="form-group">
          <Label htmlFor="email">
            이메일 <span className="required-mark">*</span>
          </Label>
          <div className="relative">
            <Mail className="input-icon" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="이메일 주소를 입력하세요"
              value={formData.email}
              onChange={handleChange}
              className={`input-with-icon ${errors.email ? "border-destructive" : ""}`}
              required
            />
          </div>
          {errors.email && (
            <p className="error-message">{errors.email}</p>
          )}
        </div>
        
        {/* 비밀번호 입력 */}
        <div className="form-group">
          <Label htmlFor="password">
            비밀번호 <span className="required-mark">*</span>
            <span className="text-xs text-pronto-gray-400 ml-1">
              (8자 이상, 영문/숫자/특수문자 조합)
            </span>
          </Label>
          <div className="relative">
            <Lock className="input-icon" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호를 입력하세요"
              value={formData.password}
              onChange={handleChange}
              className={`input-with-icon ${errors.password ? "border-destructive" : ""}`}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-pronto-gray-400"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="error-message">{errors.password}</p>
          )}
        </div>
        
        {/* 비밀번호 확인 */}
        <div className="form-group">
          <Label htmlFor="confirmPassword">비밀번호 확인 <span className="required-mark">*</span></Label>
          <div className="relative">
            <Lock className="input-icon" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="비밀번호를 다시 입력하세요"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`input-with-icon ${errors.confirmPassword ? "border-destructive" : ""}`}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-pronto-gray-400"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="error-message">{errors.confirmPassword}</p>
          )}
        </div>
        
        {/* 이름 입력 */}
        <div className="form-group">
          <Label htmlFor="name">이름 <span className="required-mark">*</span></Label>
          <div className="relative">
            <User className="input-icon" />
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="이름을 입력하세요"
              value={formData.name}
              onChange={handleChange}
              className={`input-with-icon ${errors.name ? "border-destructive" : ""}`}
              required
            />
          </div>
          {errors.name && (
            <p className="error-message">{errors.name}</p>
          )}
        </div>
        
        {/* 휴대폰 번호 입력 */}
        <div className="form-group">
          <Label htmlFor="phone">휴대폰 번호 <span className="required-mark">*</span></Label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Phone className="input-icon" />
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="휴대폰 번호를 입력하세요 (예: 01012345678)"
                value={formData.phone}
                onChange={handleChange}
                className={`input-with-icon ${errors.phone ? "border-destructive" : ""}`}
                disabled={phoneVerified}
                required
              />
            </div>
            <Button
              type="button"
              variant={phoneVerified ? "outline" : "secondary"}
              className={`whitespace-nowrap ${phoneVerified ? "bg-green-50 text-green-600 border-green-200" : ""}`}
              onClick={sendVerificationCode}
              disabled={isVerifyingPhone || phoneVerified || !formData.phone}
            >
              {phoneVerified ? "인증 완료" : isVerifyingPhone ? "전송 중..." : "인증 요청"}
            </Button>
          </div>
          {errors.phone && (
            <p className="error-message">{errors.phone}</p>
          )}
          
          {/* 인증 코드 입력 */}
          {showVerificationInput && !phoneVerified && (
            <div className="mt-2 form-group">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="인증 코드 6자리 입력"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className={errors.verificationCode ? "border-destructive" : ""}
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={verifyPhoneCode}
                  disabled={isVerifyingPhone || verificationCode.length < 6}
                >
                  {isVerifyingPhone ? "확인 중..." : "확인"}
                </Button>
              </div>
              {errors.verificationCode && (
                <p className="error-message">{errors.verificationCode}</p>
              )}
              <p className="text-xs text-pronto-gray-500">
                인증 코드는 3분 동안 유효합니다. 코드를 받지 못하셨다면 &apos;인증 요청&apos;을 다시 클릭해주세요.
              </p>
            </div>
          )}
        </div>
        
        {/* 약관 동의 */}
        <div className="mt-6 space-y-4 border rounded-md p-4 bg-pronto-gray-50">
          <div className="flex items-start space-x-2">
            <Checkbox 
              id="agreement-all" 
              checked={agreements.all}
              onCheckedChange={() => handleAgreementChange('all')}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label 
                htmlFor="agreement-all" 
                className="font-medium text-base cursor-pointer"
              >
                전체동의 (선택항목에 대한 동의 포함)
              </Label>
              <p className="text-xs text-pronto-gray-500">
                이용약관, 개인정보 수집 및 이용, 마케팅 활용 동의, 알림 수신에 모두 동의합니다.
              </p>
            </div>
          </div>
          
          <div className="w-full h-px bg-pronto-gray-200 my-2"></div>
          
          <div className="space-y-3">
            {/* 만 14세 이상 */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="agreement-age" 
                checked={agreements.age}
                onCheckedChange={() => handleAgreementChange('age')}
              />
              <Label 
                htmlFor="agreement-age" 
                className="cursor-pointer flex items-center"
              >
                만 14세 이상입니다 <span className="required-mark ml-1">(필수)</span>
              </Label>
            </div>
            {errors.age && (
              <p className="error-message ml-6">{errors.age}</p>
            )}
            
            {/* 이용약관 */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="agreement-terms" 
                checked={agreements.terms}
                onCheckedChange={() => handleAgreementChange('terms')}
              />
              <div className="flex items-center">
                <Label 
                  htmlFor="agreement-terms" 
                  className="cursor-pointer"
                >
                  이용약관 <span className="required-mark ml-1">(필수)</span>
                </Label>
                <Link href="#" className="text-xs text-pronto-primary ml-2 hover:underline">
                  보기
                </Link>
              </div>
            </div>
            {errors.terms && (
              <p className="error-message ml-6">{errors.terms}</p>
            )}
            
            {/* 개인정보 마케팅 활용 동의 */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="agreement-marketing" 
                checked={agreements.marketing}
                onCheckedChange={() => handleAgreementChange('marketing')}
              />
              <div className="flex items-center">
                <Label 
                  htmlFor="agreement-marketing" 
                  className="cursor-pointer"
                >
                  개인정보 마케팅 활용 동의 <span className="text-pronto-gray-500 ml-1">(선택)</span>
                </Label>
                <Link href="#" className="text-xs text-pronto-primary ml-2 hover:underline">
                  보기
                </Link>
              </div>
            </div>
            
            {/* 알림 수신 동의 */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="agreement-notification" 
                checked={agreements.notification}
                onCheckedChange={() => handleAgreementChange('notification')}
              />
              <Label 
                htmlFor="agreement-notification" 
                className="cursor-pointer"
              >
                이벤트, 쿠폰, 특가 알림 메일 및 SMS 등 수신 <span className="text-pronto-gray-500 ml-1">(선택)</span>
              </Label>
            </div>
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="w-full btn-primary font-medium mt-4" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "처리 중..." : "회원가입"}
          {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>
      
      <div className="text-center text-sm">
        <span className="text-pronto-gray-500">이미 계정이 있으신가요?</span>{" "}
        <Link href="/auth/login" className="text-pronto-primary font-medium hover:underline">
          로그인하기
        </Link>
      </div>
    </div>
  );
} 