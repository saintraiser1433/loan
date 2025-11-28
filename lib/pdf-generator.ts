import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface ReportData {
  title: string
  subtitle?: string
  dateRange?: string
  summary?: { label: string; value: string | number }[]
  tableHeaders: string[]
  tableData: (string | number)[][]
}

export function generatePDFReport(data: ReportData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129] // Emerald
  const darkColor: [number, number, number] = [31, 41, 55]
  const grayColor: [number, number, number] = [107, 114, 128]
  
  let yPos = 20

  // Header background
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 45, "F")
  
  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("Glan Credible and Capital Inc.", pageWidth / 2, yPos, { align: "center" })
  
  yPos += 8
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("Online Lending Management System", pageWidth / 2, yPos, { align: "center" })
  
  yPos += 12
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(data.title, pageWidth / 2, yPos, { align: "center" })
  
  yPos = 55
  
  // Date and generation info
  doc.setTextColor(...grayColor)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const generatedDate = new Date().toLocaleString()
  doc.text(`Generated: ${generatedDate}`, 14, yPos)
  
  if (data.dateRange) {
    doc.text(`Period: ${data.dateRange}`, pageWidth - 14, yPos, { align: "right" })
  }
  
  yPos += 10
  
  // Summary cards (if provided)
  if (data.summary && data.summary.length > 0) {
    const cardWidth = (pageWidth - 28 - (data.summary.length - 1) * 5) / data.summary.length
    const cardHeight = 25
    
    data.summary.forEach((item, index) => {
      const xPos = 14 + index * (cardWidth + 5)
      
      // Card background
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, "F")
      
      // Card border
      doc.setDrawColor(229, 231, 235)
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, "S")
      
      // Label
      doc.setTextColor(...grayColor)
      doc.setFontSize(8)
      doc.text(item.label, xPos + cardWidth / 2, yPos + 8, { align: "center" })
      
      // Value
      doc.setTextColor(...darkColor)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(String(item.value), xPos + cardWidth / 2, yPos + 18, { align: "center" })
      doc.setFont("helvetica", "normal")
    })
    
    yPos += cardHeight + 15
  }
  
  // Table
  if (data.tableData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [data.tableHeaders],
      body: data.tableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: darkColor,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { halign: "left" },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on each page
        const pageCount = doc.getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(...grayColor)
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        )
      },
    })
  } else {
    doc.setTextColor(...grayColor)
    doc.setFontSize(10)
    doc.text("No data available for this report.", pageWidth / 2, yPos + 20, { align: "center" })
  }
  
  return doc
}

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Format currency for PDF (use PHP instead of peso sign since PDF fonts don't support it well)
export function formatCurrencyForPDF(amount: number): string {
  return `PHP ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}



