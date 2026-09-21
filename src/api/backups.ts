import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore } from './mockStore';
import { listProducts } from './products';
import { listSales } from './sales';
import { listLayaways } from './layaways';
import { getPeriodSummary } from './reports';
import { formatCurrency, formatDateTime } from '../utils/format';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Arma un respaldo técnico completo (todas las tablas tal cual están en
 * la base) y lo descarga como un archivo .json al dispositivo.
 * Independiente del respaldo automático diario en Storage — para que
 * la dueña pueda guardar una copia cuando quiera, sin depender del cron.
 * Es un respaldo de seguridad, no un reporte para leer — para eso está
 * `downloadExcel`.
 */
export async function downloadBackup(): Promise<void> {
  let backup: Record<string, unknown>;

  if (!isSupabaseConfigured) {
    const store = getStore();
    backup = {
      generated_at: new Date().toISOString(),
      products: store.products,
      sales: store.sales.map(({ items, ...sale }) => sale),
      sale_items: store.sales.flatMap((s) => s.items),
      customers: store.customers,
      layaways: store.layaways.map(({ items, payments, ...layaway }) => layaway),
      layaway_items: store.layaways.flatMap((l) => l.items),
      layaway_payments: store.layaways.flatMap((l) => l.payments),
      business_settings: store.settings,
    };
  } else {
    const tableNames = [
      'products',
      'sales',
      'sale_items',
      'customers',
      'layaways',
      'layaway_items',
      'layaway_payments',
      'business_settings',
    ] as const;

    const results = await Promise.all(
      tableNames.map((table) => supabase.from(table).select('*'))
    );
    for (const res of results) {
      if (res.error) throw res.error;
    }

    backup = { generated_at: new Date().toISOString() };
    tableNames.forEach((table, i) => {
      backup[table] = results[i].data;
    });
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  triggerDownload(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    `moon-sport-respaldo-${dateKey}.json`
  );
}

/**
 * Carga el logo y lo reduce a un tamaño chico antes de convertirlo a
 * data-URL — el ícono original es de 1024x1024 (~800 KB); en el PDF se
 * ve a 18mm, así que no tiene caso incrustarlo a su resolución
 * completa (infla el PDF a varios MB por nada).
 */
async function loadLogoAsDataUrl(url: string, size = 160): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  } catch {
    return null; // sin logo no se rompe el reporte, solo se omite
  }
}

const NAVY: [number, number, number] = [16, 22, 46];
const GOLD: [number, number, number] = [217, 167, 44];
const PAGE_MARGIN = 14;

/**
 * Exporta un reporte de negocio a PDF, con formato de presentación
 * (logo, encabezado, secciones con tablas) listo para compartir con un
 * contador o revisar por correo — no es un volcado de la base de
 * datos, son cifras y movimientos ya traducidos a algo legible.
 */
export async function downloadPdf(): Promise<void> {
  const [{ jsPDF }, autoTableModule, logoDataUrl, products, sales, layaways, today, week, month] =
    await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
      loadLogoAsDataUrl(`${import.meta.env.BASE_URL}icon.png`),
      listProducts(),
      listSales(1000),
      listLayaways(),
      getPeriodSummary('today'),
      getPeriodSummary('week'),
      getPeriodSummary('month'),
    ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Encabezado: logo + nombre + fecha de generación.
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', PAGE_MARGIN, 10, 18, 18);
  }
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Moon Sport', PAGE_MARGIN + 22, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text('Reporte de negocio', PAGE_MARGIN + 22, 25);
  doc.setFontSize(9);
  doc.text(`Generado: ${formatDateTime(new Date().toISOString())}`, PAGE_MARGIN + 22, 30);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, 34, pageWidth - PAGE_MARGIN, 34);

  let y = 42;

  function ensureSpace(minHeight: number) {
    if (y + minHeight > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  }

  function section(
    title: string,
    head: string[],
    body: (string | number)[][],
    moneyCols: number[] = []
  ) {
    ensureSpace(20);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, PAGE_MARGIN, y);
    y += 4;

    if (body.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.text('Sin datos en este periodo.', PAGE_MARGIN, y + 4);
      y += 12;
      return;
    }

    const formattedBody = body.map((row) =>
      row.map((cell, i) => (moneyCols.includes(i) ? formatCurrency(Number(cell)) : cell))
    );

    autoTable(doc, {
      startY: y,
      head: [head],
      body: formattedBody,
      theme: 'striped',
      headStyles: { fillColor: NAVY, textColor: 255, fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  section(
    'Resumen',
    ['Periodo', 'Ingresos', 'Costo de mercancía', 'Ganancia', 'Ventas'],
    [
      ['Hoy', today.revenue, today.cost, today.grossProfit, today.salesCount],
      ['Esta semana', week.revenue, week.cost, week.grossProfit, week.salesCount],
      ['Este mes', month.revenue, month.cost, month.grossProfit, month.salesCount],
    ],
    [1, 2, 3]
  );

  section(
    'Ventas',
    ['Fecha', 'Cliente', 'Método de pago', 'Artículos', 'Total', 'Costo', 'Ganancia'],
    sales.map((s) => [
      formatDateTime(s.date),
      s.customerName ?? '—',
      s.paymentMethod,
      s.items.reduce((sum, it) => sum + it.qty, 0),
      s.total,
      s.totalCost,
      s.profit,
    ]),
    [4, 5, 6]
  );

  section(
    'Inventario',
    ['Producto', 'Categoría', 'Existencias', 'Costo', 'Precio de venta', 'Valor en inventario'],
    products.map((p) => [
      p.name,
      p.category,
      p.stock,
      p.costPrice,
      p.sellPrice,
      p.stock * p.costPrice,
    ]),
    [3, 4, 5]
  );

  const openLayaways = layaways.filter((l) => l.status === 'abierto');
  section(
    'Apartados abiertos',
    ['Fecha', 'Cliente', 'Total', 'Abonado', 'Falta'],
    openLayaways.map((l) => [
      formatDateTime(l.date),
      l.customerName ?? '—',
      l.total,
      l.deposit,
      l.total - l.deposit,
    ]),
    [2, 3, 4]
  );

  // Numera todas las páginas al final, ya con el total definitivo.
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 8, {
      align: 'right',
    });
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  doc.save(`moon-sport-reporte-${dateKey}.pdf`);
}
