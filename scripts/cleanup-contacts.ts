import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Cleaning up duplicate contact persons...")

  // Get all users with contact persons
  const users = await prisma.user.findMany({
    where: {
      contactPersons: {
        some: {}
      }
    },
    include: {
      contactPersons: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  })

  let totalDeleted = 0

  for (const user of users) {
    if (user.contactPersons.length > 3) {
      // Keep only the 3 most recent contact persons
      const contactsToDelete = user.contactPersons.slice(3)
      
      for (const contact of contactsToDelete) {
        await prisma.contactPerson.delete({
          where: { id: contact.id }
        })
        totalDeleted++
      }
      
      console.log(`User ${user.email}: Deleted ${contactsToDelete.length} duplicate contact persons`)
    }
  }

  console.log(`\nTotal deleted: ${totalDeleted} duplicate contact persons`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())



