/**
 * 지역 관련 상수들
 */
export const REGIONS = {
  SEOUL: {
    CODE: 'seoul',
    NAME: '서울',
    DISTRICTS: [
      '강남구', '강동구', '강북구', '강서구', '관악구',
      '광진구', '구로구', '금천구', '노원구', '도봉구',
      '동대문구', '동작구', '마포구', '서대문구', '서초구',
      '성동구', '성북구', '송파구', '양천구', '영등포구',
      '용산구', '은평구', '종로구', '중구', '중랑구'
    ],
  },
  GYEONGGI: {
    CODE: 'gyeonggi',
    NAME: '경기도',
    DISTRICTS: [
      '수원시', '성남시', '고양시', '용인시', '부천시',
      '안산시', '안양시', '남양주시', '화성시', '평택시',
      '의정부시', '시흥시', '파주시', '광명시', '김포시',
      '군포시', '오산시', '이천시', '양주시', '동두천시',
      '과천시', '구리시', '안성시', '포천시', '의왕시',
      '하남시', '여주시', '양평군', '가평군', '연천군'
    ],
  },
} as const;

export type RegionCode = keyof typeof REGIONS;
export type District = typeof REGIONS[RegionCode]['DISTRICTS'][number];