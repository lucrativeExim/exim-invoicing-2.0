const prisma = require('../lib/prisma');

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

async function seedStates() {
  try {
    console.log('🌱 Starting state seeding...\n');

    // Check existing states
    const existingStates = await prisma.state.findMany();
    const existingStateNames = existingStates.map(s => s.state_name);

    let addedCount = 0;
    let skippedCount = 0;

    for (const stateName of INDIAN_STATES) {
      if (existingStateNames.includes(stateName)) {
        console.log(`⏭️  Skipped: ${stateName} (already exists)`);
        skippedCount++;
      } else {
        await prisma.state.create({
          data: { state_name: stateName },
        });
        console.log(`✅ Added: ${stateName}`);
        addedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Added: ${addedCount} states`);
    console.log(`   Skipped: ${skippedCount} states (already existed)`);
    console.log(`   Total in database: ${existingStates.length + addedCount} states`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding states:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedStates();







