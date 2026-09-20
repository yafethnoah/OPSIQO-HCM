import type { PaycheckLedgerResponse, PaycheckLedgerRow } from '@/domain/paycheck';

function xml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function stringCell(value: unknown) {
  return `<Cell><Data ss:Type="String">${xml(value)}</Data></Cell>`;
}

function numberCell(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `<Cell ss:StyleID="Money"><Data ss:Type="Number">${safe}</Data></Cell>`;
}

function row(cells: string[]) {
  return `<Row>${cells.join('')}</Row>`;
}

function statusLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

function paycheckRow(item: PaycheckLedgerRow) {
  return row([
    stringCell(item.employeeNumber),
    stringCell(item.displayName),
    stringCell(item.positionTitle || ''),
    stringCell(item.orgUnitName || ''),
    stringCell(item.runName),
    stringCell(item.runStatus),
    stringCell(item.periodStart),
    stringCell(item.periodEnd),
    stringCell(item.dueDate),
    stringCell(statusLabel(item.status)),
    numberCell(item.gross),
    numberCell(item.cppOrQpp),
    numberCell(item.cpp2OrQpp2),
    numberCell(item.ei),
    numberCell(item.qpip),
    numberCell(item.federalTax),
    numberCell(item.provincialTax),
    numberCell(item.otherDeductions),
    numberCell(item.totalDeductions),
    numberCell(item.net),
    stringCell(item.currency),
    stringCell(item.payDateSource),
    stringCell(item.paymentMethodRef || ''),
    stringCell(item.paymentReference || ''),
    stringCell(item.paidDate || ''),
    stringCell(item.paidAt || ''),
    stringCell(item.paidBy || ''),
    stringCell(item.paymentNote || ''),
  ]);
}

export function paycheckLedgerExcelXml(data: PaycheckLedgerResponse) {
  const headers = [
    'Employee Number',
    'Employee Name',
    'Position',
    'Department / Org Unit',
    'Payroll Run',
    'Run Status',
    'Period Start',
    'Period End',
    'Paycheck Due Date',
    'Payment Status',
    'Gross Pay',
    'CPP/QPP',
    'CPP2/QPP2',
    'EI',
    'QPIP',
    'Federal Tax',
    'Provincial Tax',
    'Other Deductions',
    'Total Deductions',
    'Net Pay',
    'Currency',
    'Pay Date Source',
    'Payment Method Reference',
    'Payment Reference',
    'Paid Date',
    'Paid Timestamp',
    'Paid By',
    'Notes',
  ];

  const summaryRows: Array<[string, string | number]> = [
    ['As of', data.asOf],
    ['Paychecks', data.summary.total],
    ['Upcoming', data.summary.upcoming],
    ['Due Today', data.summary.dueToday],
    ['Overdue', data.summary.overdue],
    ['Paid', data.summary.paid],
    ['Total Due Amount', data.summary.totalDueAmount],
    ['Total Paid Amount', data.summary.totalPaidAmount],
  ];

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Money"><NumberFormat ss:Format="#,##0.00"/></Style>
 </Styles>
 <Worksheet ss:Name="Paychecks">
  <Table>
   ${row(headers.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xml(header)}</Data></Cell>`))}
   ${data.rows.map(paycheckRow).join('\n')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions>
 </Worksheet>
 <Worksheet ss:Name="Summary">
  <Table>
   ${row([`<Cell ss:StyleID="Header"><Data ss:Type="String">Metric</Data></Cell>`, `<Cell ss:StyleID="Header"><Data ss:Type="String">Value</Data></Cell>`])}
   ${summaryRows.map(([label, value]) => row([stringCell(label), typeof value === 'number' ? numberCell(value) : stringCell(value)])).join('\n')}
  </Table>
 </Worksheet>
</Workbook>`;
}
