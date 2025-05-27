"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, User, Phone, Mail } from "lucide-react";
import { toast } from "@/shared/hooks";
import { useSupabase } from "@/contexts/SupabaseContext";
import Link from "next/link";

export default function MyInfoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState({
    name: "",
    phone: ""
  });

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        if (!user) return;
        
        setIsLoading(true);
        console.log("사용자 정보 로드 시작, 사용자 ID:", user.id);
        
        // 기본값으로 메타데이터로부터 정보 설정
        const defaultInfo = {
          name: user.user_metadata?.name || "",
          email: user.email || "",
          phone: user.user_metadata?.phone || ""
        };
        
        // Supabase에서 customers 테이블 정보 가져오기 시도
        try {
          console.log("Supabase 클라이언트 생성 완료");
          
          const { data, error } = await supabase
            .from("customers")
            .select("nickname, phone")
            .eq("id", user.id)
            .maybeSingle();
          
          // 오류 상세 정보 출력  
          if (error) {
            console.error("Supabase 데이터 조회 오류:", 
              JSON.stringify({
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              }, null, 2)
            );
            
            // 데이터를 찾을 수 없는 경우 (처음 로그인)
            if (error.code === 'PGRST116') {
              console.log("사용자 데이터가 없어 새로 생성 시도");
              try {
                const { error: insertError } = await supabase
                  .from("customers")
                  .insert({
                    id: user.id,
                    nickname: defaultInfo.name,
                    email: defaultInfo.email,
                    phone: defaultInfo.phone,
                    auth_provider: user.app_metadata?.provider || 'email',
                    role: 'customer',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                  
                if (insertError) {
                  console.error("사용자 데이터 생성 오류:", 
                    JSON.stringify({
                      code: insertError.code,
                      message: insertError.message,
                      details: insertError.details,
                      hint: insertError.hint
                    }, null, 2)
                  );
                } else {
                  console.log("사용자 데이터 생성 성공");
                }
              } catch (insertCatchError) {
                console.error("사용자 데이터 생성 시도 중 예외 발생:", insertCatchError);
              }
            }
            
            // 오류가 있으면 메타데이터 사용
            setUserInfo(defaultInfo);
            setEditedInfo({
              name: defaultInfo.name,
              phone: defaultInfo.phone
            });
            
            // 오류지만 화면은 표시
            toast({
              title: "일부 정보만 로드됨",
              description: "계정 데이터를 완전히 불러오지 못했습니다. 정보 수정 시 완전히 저장됩니다.",
              variant: "default",
            });
            
            return;
          }
          
          console.log("데이터 조회 결과:", data);
          
          // 사용자 정보 설정 (DB 데이터 또는 메타데이터 사용)
          const updatedInfo = {
            name: data?.nickname || defaultInfo.name,
            email: defaultInfo.email, // 이메일은 항상 Auth에서
            phone: data?.phone || defaultInfo.phone
          };
          
          setUserInfo(updatedInfo);
          setEditedInfo({
            name: updatedInfo.name,
            phone: updatedInfo.phone
          });
          
        } catch (dbError) {
          console.error("Supabase 데이터베이스 접근 중 예외 발생:", dbError);
          
          // 오류 시 메타데이터 사용
          setUserInfo(defaultInfo);
          setEditedInfo({
            name: defaultInfo.name,
            phone: defaultInfo.phone
          });
          
          toast({
            title: "데이터베이스 접근 오류",
            description: "계정 정보를 불러오지 못했습니다. 일부 정보만 표시됩니다.",
            variant: "destructive",
          });
        }
        
      } catch (error) {
        console.error("전체 사용자 정보 로드 과정에서 예외 발생:", error);
        
        // 최소한의 정보라도 표시
        if (user) {
          const fallbackInfo = {
            name: user.user_metadata?.name || "",
            email: user.email || "",
            phone: user.user_metadata?.phone || ""
          };
          
          setUserInfo(fallbackInfo);
          setEditedInfo({
            name: fallbackInfo.name,
            phone: fallbackInfo.phone
          });
        }
        
        toast({
          title: "정보 로드 오류",
          description: "사용자 정보를 불러오는 중 문제가 발생했습니다. 제한된 정보만 표시됩니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!loading) {
      fetchUserInfo();
    }
  }, [user, loading]);

  // 편집 시작
  const handleEdit = () => {
    setIsEditing(true);
  };

  // 편집 취소
  const handleCancel = () => {
    setEditedInfo({
      name: userInfo.name,
      phone: userInfo.phone
    });
    setIsEditing(false);
  };

  // 변경사항 저장
  const handleSave = async () => {
    try {
      if (!user) return;
      
      setIsSaving(true);
      console.log("사용자 정보 저장 시작");
      
      // Supabase 클라이언트 사용
      
      try {
        // 먼저 사용자 데이터 존재하는지 확인
        console.log("customers 테이블 레코드 확인 중...");
        const { data: existingData, error: checkError } = await supabase
          .from("customers")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
          
        if (checkError && checkError.code !== 'PGRST116') {
          console.error("사용자 데이터 확인 오류:", 
            JSON.stringify({
              code: checkError.code,
              message: checkError.message,
              details: checkError.details,
              hint: checkError.hint
            }, null, 2)
          );
          throw checkError;
        }
        
        console.log("레코드 확인 결과:", existingData ? "존재함" : "존재하지 않음");
        
        try {
          // 사용자 데이터가 없으면 삽입, 있으면 업데이트
          if (!existingData) {
            console.log("신규 레코드 삽입 시도");
            const { error: insertError } = await supabase
              .from("customers")
              .insert({
                id: user.id,
                nickname: editedInfo.name,
                email: user.email || '',
                phone: editedInfo.phone,
                auth_provider: user.app_metadata?.provider || 'email',
                role: 'customer',
                updated_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.error("사용자 정보 삽입 오류:", 
                JSON.stringify({
                  code: insertError.code,
                  message: insertError.message,
                  details: insertError.details,
                  hint: insertError.hint
                }, null, 2)
              );
              throw insertError;
            }
            console.log("레코드 삽입 성공");
          } else {
            // 기존 데이터가 있으면 업데이트
            console.log("기존 레코드 업데이트 시도");
            const { error: updateError } = await supabase
              .from("customers")
              .update({
                nickname: editedInfo.name,
                phone: editedInfo.phone,
                updated_at: new Date().toISOString()
              })
              .eq("id", user.id);
              
            if (updateError) {
              console.error("사용자 정보 업데이트 오류:", 
                JSON.stringify({
                  code: updateError.code,
                  message: updateError.message,
                  details: updateError.details,
                  hint: updateError.hint
                }, null, 2)
              );
              throw updateError;
            }
            console.log("레코드 업데이트 성공");
          }
        } catch (dbWriteError) {
          console.error("DB 쓰기 작업 중 예외 발생:", dbWriteError);
          throw dbWriteError;
        }
      } catch (dbError) {
        console.error("데이터베이스 작업 중 예외 발생:", dbError);
        throw dbError;
      }
      
      try {
        // Auth 사용자 메타데이터도 업데이트
        console.log("Auth 메타데이터 업데이트 시도");
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            name: editedInfo.name,
            phone: editedInfo.phone
          }
        });
        
        if (metadataError) {
          console.error("사용자 메타데이터 업데이트 오류:", 
            JSON.stringify({
              code: metadataError.code,
              message: metadataError.message,
            }, null, 2)
          );
          throw metadataError;
        }
        console.log("Auth 메타데이터 업데이트 성공");
      } catch (authError) {
        console.error("Auth 작업 중 예외 발생:", authError);
        throw authError;
      }
      
      // 상태 업데이트
      setUserInfo({
        ...userInfo,
        name: editedInfo.name,
        phone: editedInfo.phone
      });
      
      setIsEditing(false);
      
      toast({
        title: "정보 업데이트 성공",
        description: "회원 정보가 성공적으로 업데이트되었습니다.",
      });
    } catch (error) {
      console.error("사용자 정보 업데이트 실패:", error);
      toast({
        title: "정보 업데이트 실패",
        description: "회원 정보 업데이트 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // 필드 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Link href="/my">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">내 정보</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>회원 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 이메일 (변경 불가) */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-pronto-primary" />
                  <Label className="text-sm font-medium">이메일</Label>
                </div>
                <div className="pl-6">
                  <p className="text-gray-700">{userInfo.email}</p>
                  <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다</p>
                </div>
              </div>

              {/* 이름 */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-pronto-primary" />
                  <Label className="text-sm font-medium">이름</Label>
                </div>
                <div className="pl-6">
                  {isEditing ? (
                    <Input
                      name="name"
                      value={editedInfo.name}
                      onChange={handleInputChange}
                      placeholder="이름을 입력하세요"
                      className="max-w-md"
                    />
                  ) : (
                    <p className="text-gray-700">{userInfo.name || "미설정"}</p>
                  )}
                </div>
              </div>

              {/* 전화번호 */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <Phone className="mr-2 h-4 w-4 text-pronto-primary" />
                  <Label className="text-sm font-medium">전화번호</Label>
                </div>
                <div className="pl-6">
                  {isEditing ? (
                    <Input
                      name="phone"
                      value={editedInfo.phone}
                      onChange={handleInputChange}
                      placeholder="전화번호를 입력하세요"
                      className="max-w-md"
                    />
                  ) : (
                    <p className="text-gray-700">{userInfo.phone || "미설정"}</p>
                  )}
                </div>
              </div>

              {/* 버튼 */}
              <div className="pt-6 flex justify-end">
                {isEditing ? (
                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                      취소
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        "저장하기"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleEdit}>정보 수정</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 