const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    const email = 'admin@lucrative.co.in';
    const password = 'admin@123';
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('❌ User with email', email, 'already exists');
      console.log('User ID:', existingUser.id);
      console.log('Status:', existingUser.status);
      await prisma.$disconnect();
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const newUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'User',
        email: email,
        password: hashedPassword,
        user_role: 'Admin',
        authority: 'Job_Details,Invoicing,Payment_Control',
        status: 'Active',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', newUser.email);
    console.log('User ID:', newUser.id);
    console.log('Role:', newUser.user_role);
    console.log('Status:', newUser.status);
    console.log('\n📝 Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdminUser();



