const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@anotherone.kr';
  const password = 'Admin1234!';
  const name = '관리자';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // 이미 있으면 isAdmin만 true로 업데이트
    await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });
    console.log(`✅ 기존 계정을 관리자로 업데이트: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      isAdmin: true,
      onboardingCompleted: true,
    },
  });

  console.log('✅ 관리자 계정 생성 완료!');
  console.log(`   이메일: ${user.email}`);
  console.log(`   비밀번호: ${password}`);
  console.log(`   이름: ${user.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
