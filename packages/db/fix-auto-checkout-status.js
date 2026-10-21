// 자동퇴근으로 덮어써진 status를 normal/late로 복구하는 스크립트
// 사용: node fix-auto-checkout-status.js        (미리보기)
//       node fix-auto-checkout-status.js --apply (실제 반영)
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');

(async () => {
  const records = await p.attendanceRecord.findMany({
    where: { status: { in: ['auto_checkout', 'overtime_auto_checkout'] } },
    include: { user: { select: { name: true } } },
    orderBy: { date: 'asc' },
  });
  const empCache = new Map();
  let late = 0, normal = 0;
  for (const r of records) {
    const key = `${r.userId}:${r.companyId}`;
    if (!empCache.has(key)) {
      empCache.set(key, await p.employment.findFirst({
        where: { userId: r.userId, companyId: r.companyId },
        orderBy: { isActive: 'desc' },
      }));
    }
    const emp = empCache.get(key);
    let status = 'normal';
    if (emp?.workStartTime && r.checkIn) {
      const [h, m] = emp.workStartTime.split(':').map(Number);
      const start = new Date(`${r.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`);
      if (r.checkIn.getTime() > start.getTime() + 60 * 1000) status = 'late';
    }
    status === 'late' ? late++ : normal++;
    const kstIn = r.checkIn ? new Date(r.checkIn.getTime() + 9 * 3600e3).toISOString().slice(11, 16) : '-';
    console.log(`${r.date} ${r.user?.name ?? r.userId} 출근 ${kstIn} (기준 ${emp?.workStartTime ?? '-'}) ${r.status} → ${status}`);
    if (APPLY) {
      await p.attendanceRecord.update({
        where: { id: r.id },
        data: { status, autoCheckoutType: r.status },
      });
    }
  }
  console.log(`\n총 ${records.length}건 (지각 ${late}, 정상 ${normal}) ${APPLY ? '반영 완료' : '미리보기 - 반영 안 됨'}`);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
