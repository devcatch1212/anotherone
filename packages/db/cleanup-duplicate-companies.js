const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 기존 중복 근무지 데이터 통합 및 정리 작업을 시작합니다...');

  // 1. 모든 근무지 데이터 조회
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'asc' }, // 오래된 데이터를 먼저 찾기 위해 정렬
  });

  console.log(`📋 총 ${companies.length}개의 근무지 레코드가 조회되었습니다.`);

  // name과 address를 기준으로 그룹화
  const groups = {};
  for (const c of companies) {
    const key = `${c.name.trim()}_${c.address.trim()}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(c);
  }

  // 중복이 있는 그룹만 필터링
  const duplicateGroups = Object.values(groups).filter(g => g.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('✅ 중복된 근무지 데이터가 존재하지 않습니다.');
    return;
  }

  console.log(`⚠️ 중복이 확인된 근무지 그룹 수: ${duplicateGroups.length}개`);

  for (const group of duplicateGroups) {
    // 가장 먼저 생성된 근무지를 대표(Primary)로 선정
    const primaryCompany = group[0];
    const duplicates = group.slice(1);
    const duplicateIds = duplicates.map(d => d.id);

    console.log(`\n🏢 대표 근무지: [${primaryCompany.name}] (ID: ${primaryCompany.id})`);
    console.log(`🗑️ 통합 및 삭제될 중복 근무지 수: ${duplicates.length}개 (IDs: ${duplicateIds.join(', ')})`);

    // 트랜잭션으로 연관 데이터 companyId 업데이트 및 삭제 일괄 처리
    await prisma.$transaction(async (tx) => {
      // 1. Employment (고용 관계) 업데이트
      // 중복된 Employment가 생길 수 있으므로(userId + companyId unique 제약), 
      // 중복되는 Employment가 있으면 하나만 남기고 병합 처리해야 함
      for (const dupId of duplicateIds) {
        const employmentsToMove = await tx.employment.findMany({ where: { companyId: dupId } });
        
        for (const emp of employmentsToMove) {
          // 대표 회사에 이미 이 유저의 Employment가 존재하는지 확인
          const exists = await tx.employment.findUnique({
            where: { userId_companyId: { userId: emp.userId, companyId: primaryCompany.id } }
          });

          if (exists) {
            // 이미 존재한다면, 중복되는 Employment 레코드를 삭제하기 전에
            // 이 Employment와 연결된 자식 레코드(AttendanceRecord 등)를 대표 Employment로 먼저 이식하고 삭제해야 함
            console.log(`🔗 유저 ${emp.userId}의 중복 계약 발견 -> 대표 계약(ID: ${exists.id})으로 데이터 이식 진행`);
            
            // AttendanceRecord 이식
            await tx.attendanceRecord.updateMany({
              where: { userId: emp.userId, companyId: dupId },
              data: { companyId: primaryCompany.id }
            });
            // PayrollRecord 이식
            await tx.payrollRecord.updateMany({
              where: { userId: emp.userId, companyId: dupId },
              data: { companyId: primaryCompany.id }
            });
            // LeaveRecord 이식
            await tx.leaveRecord.updateMany({
              where: { userId: emp.userId, companyId: dupId },
              data: { companyId: primaryCompany.id }
            });
            // OvertimeRequest 이식
            await tx.overtimeRequest.updateMany({
              where: { userId: emp.userId, companyId: dupId },
              data: { companyId: primaryCompany.id }
            });
            // Notification 이식
            await tx.notification.updateMany({
              where: { userId: emp.userId, companyId: dupId },
              data: { companyId: primaryCompany.id }
            });
            // AttendanceCorrection 이식
            await tx.attendanceCorrection.updateMany({
              where: { userId: emp.userId, companyId: dupId },
              data: { companyId: primaryCompany.id }
            });

            // 대표 계약을 활성화하고 중복 계약 제거
            await tx.employment.update({
              where: { id: exists.id },
              data: { isActive: exists.isActive || emp.isActive }
            });
            await tx.employment.delete({ where: { id: emp.id } });
          } else {
            // 대표 회사에 고용 계약이 없으면 그냥 companyId만 대표 회사로 업데이트
            await tx.employment.update({
              where: { id: emp.id },
              data: { companyId: primaryCompany.id }
            });
          }
        }
      }

      // 2. 나머지 연관 데이터들의 companyId 일괄 업데이트 (Employment 외에 직접 Company를 가리키는 관계들)
      await tx.attendanceRecord.updateMany({
        where: { companyId: { in: duplicateIds } },
        data: { companyId: primaryCompany.id }
      });
      await tx.payrollRecord.updateMany({
        where: { companyId: { in: duplicateIds } },
        data: { companyId: primaryCompany.id }
      });
      await tx.leaveRecord.updateMany({
        where: { companyId: { in: duplicateIds } },
        data: { companyId: primaryCompany.id }
      });
      await tx.overtimeRequest.updateMany({
        where: { companyId: { in: duplicateIds } },
        data: { companyId: primaryCompany.id }
      });
      await tx.notification.updateMany({
        where: { companyId: { in: duplicateIds } },
        data: { companyId: primaryCompany.id }
      });
      await tx.attendanceCorrection.updateMany({
        where: { companyId: { in: duplicateIds } },
        data: { companyId: primaryCompany.id }
      });

      // 3. 고아가 된 중복 근무지 레코드 삭제
      const deleteCount = await tx.company.deleteMany({
        where: { id: { in: duplicateIds } }
      });

      console.log(`✅ [${primaryCompany.name}] 근무지 병합 완료. 삭제된 레코드: ${deleteCount.count}개`);
    });
  }

  console.log('\n🎉 모든 중복 근무지 병합 및 정리 작업이 성공적으로 완료되었습니다.');
}

main()
  .catch((e) => {
    console.error('❌ 작업 중 오류가 발생했습니다:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
