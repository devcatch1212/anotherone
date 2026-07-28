export interface ContractTemplateInput {
  companyName: string;
  companyAddress: string;
  employeeName: string;
  employeeEmail?: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  wageType?: string; // 'hourly' | 'daily' | 'weekly' | 'monthly'
  wageAmount?: number;
  workStartTime?: string;
  workEndTime?: string;
  weeklyWorkDays?: number;
  breakMinutes?: number;
  annualSalary?: number;
}

export function generateContractContent(type: 'labor' | 'salary' | 'nda' | 'privacy', input: ContractTemplateInput): { title: string; content: string } {
  const {
    companyName,
    companyAddress,
    employeeName,
    position = '사원',
    startDate = new Date().toISOString().split('T')[0],
    endDate = '기간의 정함이 없음',
    wageType = 'hourly',
    wageAmount = 10030,
    workStartTime = '09:00',
    workEndTime = '18:00',
    weeklyWorkDays = 5,
    breakMinutes = 60,
    annualSalary = 36000000,
  } = input;

  const wageTypeLabel = wageType === 'monthly' ? '월급' : wageType === 'daily' ? '일급' : wageType === 'weekly' ? '주급' : '시급';

  if (type === 'labor') {
    return {
      title: `${companyName} 표준 근로계약서`,
      content: `[표준 근로계약서]

사업주 ${companyName}(이하 "사업주"라 함)과 근로자 ${employeeName}(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결하고 이를 성실히 준수할 것을 약정한다.

1. 근로계약기간: ${startDate} 부터 (${endDate}) 까지
2. 근무장소: ${companyAddress} (선택 및 지정 사업장)
3. 업무의 내용: ${position} 관련 업무 및 관련 제반 부대 업무
4. 근로시간 및 휴게시간
   - 근로시간: ${workStartTime} ~ ${workEndTime} (주 ${weeklyWorkDays}일 근무)
   - 휴게시간: 근무 중 ${breakMinutes}분 제공
5. 근무일 및 휴일: 주 ${weeklyWorkDays}일 근무, 주휴일은 매주 일요일(또는 지정 휴일)로 한다.
6. 임금
   - 임금 형태: ${wageTypeLabel} ${wageAmount.toLocaleString()}원
   - 계산방법: 관련 근로기준법 및 취업규칙에 따라 산정
   - 지급일: 매월 지정일(미지정 시 익월 10일) 근로자 명의 계좌로 입금한다.
7. 연차유급휴가: 근로기준법에 정하는 바에 따라 유급휴가를 부여한다.
8. 기타: 이 계약서에 정하지 아니한 사항은 근로기준법 및 사업주의 취업규칙에 따른다.

${startDate}

사업주(갑): ${companyName} (주소: ${companyAddress})
근로자(을): ${employeeName}`
    };
  }

  if (type === 'salary') {
    return {
      title: `${companyName} 연봉계약서`,
      content: `[연봉 계약서]

${companyName}(이하 "회사")와 ${employeeName}(이하 "사원")은 아래와 같이 연봉 계약을 체결한다.

1. 계약 기간: ${startDate} ~ ${new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1)).toISOString().split('T')[0]}
2. 연봉 총액: 금 ${annualSalary.toLocaleString()}원 정 (W ${annualSalary.toLocaleString()})
   - 기본급 및 법정 제수당 포함 금액임.
   - 연봉 총액은 12등분하여 매월 지급일에 분할 지급한다.
3. 성과급 및 포상: 회사의 경영 성과 및 개인 평가 결과에 따라 별도 지급할 수 있다.
4. 비밀유지 의무: 사원은 본 계약으로 체결된 연봉 내역을 타인에게 공개하거나 유출하지 아니하며, 위반 시 이에 대한 책임을 진다.
5. 연봉 재계약: 본 연봉계약 기간이 만료되는 시점에 평가를 거쳐 재계약 금액을 확정한다.

${startDate}

회사: ${companyName}
사원: ${employeeName} (${position})`
    };
  }

  if (type === 'nda') {
    return {
      title: `${companyName} 비밀유지 서약서 (NDA)`,
      content: `[비밀유지 서약서 (NDA)]

본인은 ${companyName}(이하 "회사")에 재직함에 있어 회사의 영업비밀과 지적재산권을 보호하기 위하여 다음 사항을 준수할 것을 엄숙히 서약합니다.

1. (영업비밀의 정의) "영업비밀"이라 함은 회사의 고객 정보, 기술 자료, 영업 전략, 소스코드, 임금 정보 등 비공개 정보를 말합니다.
2. (비밀유지 의무) 본인은 재직 중은 물론 퇴직 후에도 회사의 사전 승인 없이 영업비밀을 제3자에게 유출하거나 사적 목적으로 사용하지 아니합니다.
3. (자료의 반환) 본인은 퇴직 시 회사 소유의 모든 영업자료, 컴퓨터 데이터, 서류를 즉시 반환하며 무단 복사본을 소지하지 아니합니다.
4. (위반 시 책임) 본인이 이 서약서를 위반하여 회사에 손해를 입힌 경우, 관계 법령에 따른 민·형사상의 모든 법적 책임을 부담할 것을 서약합니다.

${startDate}

서약자: ${employeeName} (소속: ${companyName})`
    };
  }

  // privacy
  return {
    title: `${companyName} 개인정보 수집·이용 동의서`,
    content: `[개인정보 수집 및 이용 동의서]

${companyName}은 근로계약 체결, 임금 지급, 근태 관리 및 사회보험 신고를 위하여 아래와 같이 개인정보를 수집·이용하고자 합니다.

1. 개인정보 수집·이용 목적
   - 근로계약 체결 및 이행, 근태 관리, 급여 정산 및 명세서 발행, 4대보험 신고

2. 수집하는 개인정보 항목
   - 필수항목: 성명, 이메일, 연락처, 계좌번호, 주민등록번호(세법/보험 신고용)
   - 자동수집항목: 출퇴근 등록 시의 기기 식별자 및 GPS 위치정보(근무지 반경 검증용)

3. 개인정보의 보유 및 이용 기간
   - 퇴직 후 관련 법령(근로기준법 등)이 정한 보존 의무 기간(3년~5년) 동안 보관 후 파기

4. 동의를 거부할 권리 및 거부에 따른 불이익 안내
   - 귀하는 개인정보 수집·이용 동의를 거부할 권리가 있으나, 필수항목 동의 거부 시 근로계약 체결 및 급여 지급이 제한될 수 있습니다.

본인은 위 내용을 충분히 숙지하였으며, 회사의 개인정보 수집 및 이용에 동의합니다.

${startDate}

동의자: ${employeeName}`
  };
}
