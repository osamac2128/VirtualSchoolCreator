import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding AERO standards...')

  const aeroStandards = [
    { code: 'ELA.11.RL.1', description: 'Cite strong and thorough textual evidence to support analysis of what the text says explicitly.' },
    { code: 'ELA.11.RL.2', description: 'Determine two or more themes or central ideas of a text and analyze their development.' },
    { code: 'ELA.11.RL.3', description: 'Analyze the impact of the author’s choices regarding how to develop and relate elements of a story or drama.' },
    { code: 'ELA.11.RL.4', description: 'Determine the meaning of words and phrases as they are used in the text, including figurative and connotative meanings.' },
    { code: 'ELA.11.RL.5', description: 'Analyze how an author’s choices concerning how to structure specific parts of a text contribute to its overall structure and meaning.' },
    { code: 'ELA.11.RL.6', description: 'Analyze a case in which grasping point of view requires distinguishing what is directly stated in a text from what is really meant.' },
  ]

  for (const standard of aeroStandards) {
    await prisma.aeroStandard.upsert({
      where: { code: standard.code },
      update: { description: standard.description },
      create: { code: standard.code, description: standard.description },
    })
  }

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
