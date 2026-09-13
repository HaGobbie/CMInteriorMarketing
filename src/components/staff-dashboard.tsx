import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileDown,
  FileText,
  ImagePlus,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabaseClient';
import LogoUploadModal from '@/components/modals/logo-upload-modal';
import HeroUploadModal from '@/components/modals/hero-upload-modal';
import StaffProductModal from '@/components/modals/staff-product-modal';
import StaffQuoteModal from '@/components/modals/staff-quote-modal';
import StaffAccessModal from '@/components/modals/staff-access-modal';
import { isSuperAdminRole, type StaffProfile } from '@/lib/auth';
import {
  fetchHeroImages,
  publicHeroUrl,
  writeStoredHeroImages,
  type HeroImage,
} from '@/lib/heroImages';
import {
  areaAmount,
  areasOf,
  categorySubOptions,
  itemDisplayName,
  itemTotalAmount,
  itemTotalQuantity,
  newAreaLine,
  orderStatuses,
  type FulfillmentOrder,
  type InquiryCategory,
  type Product,
  type QuotationAreaLine,
  type QuotationLineItem,
} from '@/lib/mockData';

type StaffDashboardProps = {
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  orders: FulfillmentOrder[];
  setOrders: Dispatch<SetStateAction<FulfillmentOrder[]>>;
  onClose: () => void;
  staffProfile: StaffProfile;
};

type OrderDraft = {
  status: string;
  courier: string;
  items: QuotationLineItem[];
};

type InquiryDraft = {
  forDescription: string;
  address: string;
  items: QuotationLineItem[];
  discount: number;
  deliveryMobilization: number;
};

type RowSaveState = 'saving' | 'saved' | 'error';

const inquiryStatuses = ['Quote Requested', 'Draft Quote'];
const inquiryCategories: InquiryCategory[] = [
  'Blinds',
  'Custom Curtains',
  'Carpets',
  'Wallpapers',
  'Other',
];

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cloneItems = (items: QuotationLineItem[]) =>
  items.map((item) => ({
    ...item,
    areas: areasOf(item).map((area) => ({ ...area })),
    photos: item.photos ? [...item.photos] : [],
  }));

const itemAmount = (item: QuotationLineItem) => itemTotalAmount(item);

const draftFromOrder = (order: FulfillmentOrder): OrderDraft => ({
  status: order.status,
  courier: order.courier,
  items: cloneItems(order.items),
});

const inquiryDraftFromOrder = (
  order: FulfillmentOrder,
): InquiryDraft => ({
  forDescription: order.forDescription,
  address: order.address,
  items: cloneItems(order.items),
  discount: numberValue(order.discount),
  deliveryMobilization: numberValue(order.deliveryMobilization),
});

const isInquiryOrder = (order: FulfillmentOrder) =>
  order.isDraft === true || inquiryStatuses.includes(order.status);

const statusCandidates = (label: string) => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const aliases: Record<string, string[]> = {
    'Quote Requested': ['Quote Requested', 'quote_requested', 'pending'],
    'Draft Quote': ['Draft Quote', 'draft_quote', 'draft'],
    'Confirmed Order': ['Confirmed Order', 'confirmed_order', 'confirmed'],
    'Pending Sourcing': [
      'Pending Sourcing',
      'pending_sourcing',
      'processing',
    ],
    'Sourced from Davao Warehouse': [
      'Sourced from Davao Warehouse',
      'sourced_from_davao_warehouse',
      'sourced_davao_warehouse',
      'processing',
    ],
    'Sourced from Homedex / Manila': [
      'Sourced from Homedex / Manila',
      'sourced_from_homedex_manila',
      'sourced_homedex_manila',
      'processing',
    ],
    'In Transit': ['In Transit', 'in_transit', 'shipped'],
    'Ready for Installation': [
      'Ready for Installation',
      'ready_for_installation',
      'ready_for_delivery',
    ],
    Fulfilled: ['Fulfilled', 'fulfilled', 'delivered'],
  };
  return [...new Set([...(aliases[label] ?? []), slug])];
};

const inquiryContact = (order: FulfillmentOrder) => {
  // order.contacts is a legacy free-text summary that already repeats
  // whatever is in customerPhone/customerEmail/socialHandle, so showing
  // both duplicates every field. Prefer the structured fields, and only
  // fall back to the free-text summary for older rows that predate them.
  const structured = [
    order.customerPhone ? `Phone: ${order.customerPhone}` : '',
    order.customerEmail ? `Email: ${order.customerEmail}` : '',
    order.socialHandle ? `Social: ${order.socialHandle}` : '',
  ].filter(Boolean);
  return structured.length > 0 ? structured.join(' · ') : order.contacts;
};

const inputStyle = {
  width: '100%',
  border: '1px solid var(--sand)',
  background: 'white',
  color: 'var(--obsidian)',
  padding: '8px 9px',
  fontSize: 11,
};

const areaSummary = (item: QuotationLineItem) =>
  areasOf(item)
    .map((area) => area.area)
    .filter(Boolean)
    .join(', ');

export default function StaffDashboard({
  products,
  setProducts,
  orders,
  setOrders,
  onClose,
  staffProfile,
}: StaffDashboardProps) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteOrder, setQuoteOrder] = useState<FulfillmentOrder | undefined>();
  const [quoteMode, setQuoteMode] = useState<'create' | 'convert' | 'edit'>('create');
  const [logoUploadOpen, setLogoUploadOpen] = useState(false);
  const [staffManagerOpen, setStaffManagerOpen] = useState(false);
  const [heroUploadOpen, setHeroUploadOpen] = useState(false);
  const [heroModalOpen, setHeroModalOpen] = useState(false);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [heroImagesLoading, setHeroImagesLoading] = useState(true);
  const [productEditor, setProductEditor] = useState<{
    product?: Product;
  } | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const [actionError, setActionError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>({});
  const [dirtyOrders, setDirtyOrders] = useState<Record<string, boolean>>({});
  const [rowSaveStates, setRowSaveStates] = useState<
    Record<string, RowSaveState | undefined>
  >({});
  const [rowSaveErrors, setRowSaveErrors] = useState<Record<string, string>>(
    {},
  );
  const [selectedInquiry, setSelectedInquiry] =
    useState<FulfillmentOrder | null>(null);
  const [inquiryDraft, setInquiryDraft] = useState<InquiryDraft | null>(null);
  const [inquirySaveState, setInquirySaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [inquirySaveError, setInquirySaveError] = useState('');
  const [inquiryExportError, setInquiryExportError] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [lightboxPhoto, setLightboxPhoto] = useState('');

  const inquiryOrders = useMemo(
    () => orders.filter(isInquiryOrder),
    [orders],
  );
  const activeOrders = useMemo(
    () => orders.filter((order) => !isInquiryOrder(order)),
    [orders],
  );

  useEffect(() => {
    let mounted = true;
    void fetchHeroImages().then((images) => {
      if (!mounted) return;
      setHeroImages(images);
      setHeroImagesLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const getDraft = (order: FulfillmentOrder) =>
    drafts[order.id] ?? draftFromOrder(order);

  const openCreateQuotation = () => {
    setQuoteOrder(undefined);
    setQuoteMode('create');
    setQuoteOpen(true);
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrderIds((current) => ({
      ...current,
      [orderId]: !current[orderId],
    }));
  };

  const openOrderEditor = (order: FulfillmentOrder) => {
    setQuoteOrder(order);
    setQuoteMode('edit');
    setQuoteOpen(true);
  };

  const closeQuote = () => {
    setQuoteOpen(false);
    setQuoteOrder(undefined);
    setQuoteMode('create');
  };

  const deleteOrder = async (order: FulfillmentOrder) => {
    if (
      !window.confirm(
        `Delete the order for ${order.client || 'this client'}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setActionError('');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setActionError('Please sign in through Supabase Auth before deleting an order.');
      return;
    }

    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) {
      setActionError(`Could not delete order: ${error.message}`);
      return;
    }

    setOrders((current) => current.filter((currentOrder) => currentOrder.id !== order.id));
    setDrafts((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
    setDirtyOrders((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
    setExpandedOrderIds((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
    if (selectedInquiry?.id === order.id) closeInquiry();
    if (quoteOrder?.id === order.id) closeQuote();
  };

  const exportInquiryToExcel = async () => {
    if (!selectedInquiry || !inquiryDraft) return;
    setInquiryExportError('');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CM Interiors Marketing';
      const worksheet = workbook.addWorksheet('Inquiry');
      worksheet.columns = [
        { key: 'qty', width: 8 },
        { key: 'label', width: 40 },
        { key: 'width', width: 12 },
        { key: 'height', width: 12 },
        { key: 'unitPrice', width: 16 },
        { key: 'amount', width: 16 },
      ];
      worksheet.addRow(['CM INTERIORS MARKETING', '', '', '', '', '']);
      worksheet.addRow(['Inquiry reference', selectedInquiry.id]);
      worksheet.addRow(['Client', selectedInquiry.client]);
      worksheet.addRow(['Contact', inquiryContact(selectedInquiry)]);
      worksheet.addRow(['Project description', inquiryDraft.forDescription]);
      worksheet.addRow(['Address / installation area', inquiryDraft.address]);
      worksheet.addRow([]);
      worksheet.addRow([
        'Qty/Sets',
        'Description / Particulars',
        'W (in)',
        'H (in)',
        'Unit price',
        'Amount',
      ]);
      const headerRowNumber = worksheet.lastRow?.number ?? 8;

      inquiryDraft.items.forEach((item) => {
        const heading = [itemDisplayName(item), item.subOption]
          .filter(Boolean)
          .join(' — ');
        const headingRow = worksheet.addRow(['', heading, '', '', '', '']);
        headingRow.font = { bold: true };
        if (item.customNotes) {
          const noteRow = worksheet.addRow(['', item.customNotes, '', '', '', '']);
          noteRow.font = { italic: true, color: { argb: '69645E' } };
        }
        areasOf(item).forEach((area) => {
          worksheet.addRow([
            area.quantity,
            area.area,
            area.width || '',
            area.height || '',
            area.unitPrice,
            areaAmount(area),
          ]);
        });
        const subtotalRow = worksheet.addRow([
          '',
          'Item subtotal',
          '',
          '',
          '',
          itemAmount(item),
        ]);
        subtotalRow.font = { italic: true };
      });

      worksheet.addRow([]);
      const totalPhp = inquiryDraft.items.reduce((sum, item) => sum + itemAmount(item), 0);
      const discount = Math.max(0, numberValue(inquiryDraft.discount));
      const subTotal = Math.max(0, totalPhp - discount);
      const delivery = Math.max(0, numberValue(inquiryDraft.deliveryMobilization));
      worksheet.addRow(['', 'Total materials', '', '', '', totalPhp]);
      worksheet.addRow(['', 'Discount', '', '', '', discount]);
      worksheet.addRow(['', 'Sub total', '', '', '', subTotal]);
      worksheet.addRow(['', 'Delivery and mobilization', '', '', '', delivery]);
      const grandTotalRow = worksheet.addRow(['', 'Grand total', '', '', '', subTotal + delivery]);
      grandTotalRow.font = { bold: true };

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'top', wrapText: true };
          if (rowNumber === 1 || rowNumber === headerRowNumber) {
            cell.font = { ...(cell.font ?? {}), bold: true };
          }
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `CM-Inquiry-${selectedInquiry.client || selectedInquiry.id}.xlsx`;
      saveAs(
        new Blob([buffer as BlobPart], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        filename.replace(/[^a-zA-Z0-9._-]+/g, '-'),
      );
    } catch (exportFailure) {
      setInquiryExportError(
        exportFailure instanceof Error
          ? exportFailure.message
          : 'The inquiry could not be exported.',
      );
    }
  };

  const updateDraft = (
    order: FulfillmentOrder,
    patch: Partial<OrderDraft>,
  ) => {
    setDrafts((current) => {
      const currentDraft = current[order.id] ?? draftFromOrder(order);
      return {
        ...current,
        [order.id]: {
          ...currentDraft,
          ...patch,
        },
      };
    });
    setDirtyOrders((current) => ({ ...current, [order.id]: true }));
    setRowSaveStates((current) => ({
      ...current,
      [order.id]: undefined,
    }));
    setRowSaveErrors((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
  };

  const updateItemWaybill = (
    order: FulfillmentOrder,
    itemIndex: number,
    waybillNumber: string,
  ) => {
    const draft = getDraft(order);
    updateDraft(order, {
      items: draft.items.map((item, index) =>
        index === itemIndex
          ? { ...item, waybillNumber: waybillNumber || undefined }
          : item,
      ),
    });
  };

  const saveOrderUpdates = async (order: FulfillmentOrder) => {
    const draft = getDraft(order);
    setActionError('');
    setRowSaveStates((current) => ({ ...current, [order.id]: 'saving' }));
    setRowSaveErrors((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const message =
        'Please sign in through Supabase Auth before saving order updates.';
      setRowSaveStates((current) => ({ ...current, [order.id]: 'error' }));
      setRowSaveErrors((current) => ({ ...current, [order.id]: message }));
      return;
    }

    const candidates = statusCandidates(draft.status);
    let lastError: { message: string } | null = null;

    for (const status of candidates) {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          courier: draft.courier.trim(),
          items: draft.items,
        })
        .eq('id', order.id);

      if (!error) {
        const updatedOrder = {
          ...order,
          status: draft.status,
          courier: draft.courier.trim(),
          items: cloneItems(draft.items),
          waybillNumber:
            order.waybillNumber ||
            draft.items.find((item) => item.waybillNumber)?.waybillNumber ||
            '',
        };
        setOrders((current) =>
          current.map((currentOrder) =>
            currentOrder.id === order.id ? updatedOrder : currentOrder,
          ),
        );
        setDrafts((current) => {
          const next = { ...current };
          delete next[order.id];
          return next;
        });
        setDirtyOrders((current) => {
          const next = { ...current };
          delete next[order.id];
          return next;
        });
        setRowSaveStates((current) => ({ ...current, [order.id]: 'saved' }));
        window.setTimeout(() => {
          setRowSaveStates((current) => {
            if (current[order.id] !== 'saved') return current;
            return { ...current, [order.id]: undefined };
          });
        }, 2200);
        return;
      }
      lastError = error;
    }

    const message = lastError
      ? `Could not save updates: ${lastError.message}`
      : 'Could not save updates.';
    setRowSaveStates((current) => ({ ...current, [order.id]: 'error' }));
    setRowSaveErrors((current) => ({ ...current, [order.id]: message }));
  };

  const openInquiry = (order: FulfillmentOrder) => {
    setSelectedInquiry(order);
    setInquiryDraft(inquiryDraftFromOrder(order));
    setInquirySaveState('idle');
    setInquirySaveError('');
    setInquiryExportError('');
  };

  const closeInquiry = () => {
    if (inquirySaveState === 'saving') return;
    setSelectedInquiry(null);
    setInquiryDraft(null);
    setInquirySaveState('idle');
    setInquirySaveError('');
    setInquiryExportError('');
  };

  const updateInquiry = (patch: Partial<InquiryDraft>) => {
    setInquiryDraft((current) => (current ? { ...current, ...patch } : current));
    setInquirySaveState('idle');
    setInquirySaveError('');
  };

  const updateInquiryItem = (
    itemIndex: number,
    patch: Partial<QuotationLineItem>,
  ) => {
    setInquiryDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, index) =>
              index === itemIndex ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
    setInquirySaveState('idle');
    setInquirySaveError('');
  };

  const setInquiryItemCategory = (itemIndex: number, category: InquiryCategory) => {
    updateInquiryItem(itemIndex, {
      category,
      subOption: categorySubOptions[category]?.[0] ?? '',
    });
  };

  const removeInquiryItem = (itemIndex: number) => {
    setInquiryDraft((current) =>
      current && current.items.length > 1
        ? {
            ...current,
            items: current.items.filter((_, index) => index !== itemIndex),
          }
        : current,
    );
  };

  const addInquiryItem = () => {
    setInquiryDraft((current) =>
      current
        ? {
            ...current,
            items: [
              ...current.items,
              {
                id: `draft-item-${Date.now()}-${current.items.length}`,
                category: 'Other',
                subOption: '',
                itemName: '',
                material: '',
                area: '',
                customNotes: '',
                supplier: '',
                photos: [],
                areas: [newAreaLine()],
                quantity: 1,
                height: 0,
                width: 0,
                unitPrice: 0,
                amount: 0,
              },
            ],
          }
        : current,
    );
  };

  const updateInquiryArea = (
    itemIndex: number,
    areaIndex: number,
    patch: Partial<QuotationAreaLine>,
  ) => {
    setInquiryDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, index) => {
              if (index !== itemIndex) return item;
              const nextAreas = areasOf(item).map((area, areaIdx) =>
                areaIdx === areaIndex ? { ...area, ...patch } : area,
              );
              return { ...item, areas: nextAreas };
            }),
          }
        : current,
    );
    setInquirySaveState('idle');
    setInquirySaveError('');
  };

  const addInquiryArea = (itemIndex: number) => {
    setInquiryDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, index) =>
              index === itemIndex
                ? { ...item, areas: [...areasOf(item), newAreaLine(areasOf(item).length)] }
                : item,
            ),
          }
        : current,
    );
  };

  const removeInquiryArea = (itemIndex: number, areaIndex: number) => {
    setInquiryDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, index) => {
              if (index !== itemIndex) return item;
              const areas = areasOf(item);
              if (areas.length <= 1) return item;
              return { ...item, areas: areas.filter((_, areaIdx) => areaIdx !== areaIndex) };
            }),
          }
        : current,
    );
  };

  const saveInquiry = async (convertToOrder: boolean) => {
    if (!selectedInquiry || !inquiryDraft) return;
    setInquirySaveState('saving');
    setInquirySaveError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setInquirySaveState('error');
      setInquirySaveError(
        'Please sign in through Supabase Auth before saving inquiry changes.',
      );
      return;
    }

    const normalizedItems = inquiryDraft.items.map((item) => {
      const areas = areasOf(item).map((area) => ({
        ...area,
        area: area.area.trim(),
        quantity: Math.max(1, Math.trunc(numberValue(area.quantity))),
        unitPrice: Math.max(0, numberValue(area.unitPrice)),
        amount: areaAmount(area),
      }));
      const amount = areas.reduce((sum, area) => sum + area.amount, 0);
      const quantity = areas.reduce((sum, area) => sum + area.quantity, 0) || 1;
      return {
        ...item,
        itemName: item.itemName?.trim() || '',
        material: item.material.trim(),
        area: areas.map((area) => area.area).filter(Boolean).join(', ') || item.area,
        customNotes: item.customNotes?.trim() || '',
        supplier: item.supplier?.trim() || '',
        areas,
        quantity,
        height: areas[0]?.height ?? item.height,
        width: areas[0]?.width ?? item.width,
        unitPrice: areas.length === 1 ? areas[0].unitPrice : item.unitPrice,
        amount,
      };
    });
    const totalPhp = normalizedItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const discount = Math.max(0, numberValue(inquiryDraft.discount));
    const subTotal = Math.max(0, totalPhp - discount);
    const deliveryMobilization = Math.max(
      0,
      numberValue(inquiryDraft.deliveryMobilization),
    );
    const grandTotal = subTotal + deliveryMobilization;
    const targetStatus = 'Draft Quote';
    let lastError: { message: string } | null = null;

    for (const status of statusCandidates(targetStatus)) {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          for_description: inquiryDraft.forDescription.trim(),
          address: inquiryDraft.address.trim(),
          items: normalizedItems,
          total_php: totalPhp,
          discount,
          sub_total: subTotal,
          delivery_mobilization: deliveryMobilization,
          grand_total: grandTotal,
          estimated_total: grandTotal,
        })
        .eq('id', selectedInquiry.id);

      if (!error) {
        const updatedOrder: FulfillmentOrder = {
          ...selectedInquiry,
          status: targetStatus,
          isDraft: true,
          source: 'custom_inquiry',
          forDescription: inquiryDraft.forDescription.trim(),
          address: inquiryDraft.address.trim(),
          items: cloneItems(normalizedItems),
          amount: grandTotal,
          totalPhp,
          discount,
          subTotal,
          deliveryMobilization,
          grandTotal,
        };
        setOrders((current) =>
          current.map((order) =>
            order.id === selectedInquiry.id ? updatedOrder : order,
          ),
        );
        if (convertToOrder) {
          setSelectedInquiry(null);
          setInquiryDraft(null);
          setInquirySaveState('idle');
          setQuoteOrder(updatedOrder);
          setQuoteMode('convert');
          setQuoteOpen(true);
        } else {
          setInquirySaveState('saved');
          setSelectedInquiry(updatedOrder);
          setInquiryDraft(inquiryDraftFromOrder(updatedOrder));
        }
        return;
      }
      lastError = error;
    }

    setInquirySaveState('error');
    setInquirySaveError(
      lastError
        ? `Could not save inquiry: ${lastError.message}`
        : 'Could not save inquiry.',
    );
  };

  const saveProduct = (product: Product, existingId?: string) => {
    setProducts((current) => {
      if (!existingId) return [...current, product];
      return current.map((currentProduct) =>
        currentProduct.id === existingId ? product : currentProduct,
      );
    });
    setProductEditor(null);
  };

  const archiveProduct = async (id: string) => {
    setActionError('');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setActionError(
        'Please sign in through Supabase Auth before editing the catalog.',
      );
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      setActionError(`Could not delete product: ${error.message}`);
      return;
    }
    setProducts((current) =>
      current.filter((product) => product.id !== id),
    );
  };

  const openNewProduct = () => {
    setActionError('');
    setProductEditor({});
  };

  const removeHeroImage = async (image: HeroImage) => {
    setActionError('');
    const { error } = await supabase
      .from('hero_images')
      .delete()
      .eq('id', image.id);

    if (error) {
      setActionError(`Could not remove hero image: ${error.message}`);
      return;
    }

    const nextImages = heroImages.filter((current) => current.id !== image.id);
    setHeroImages(nextImages);
    writeStoredHeroImages(nextImages);
  };

  return (
    <div
      className="staff-page"
      style={{
        minHeight: '100vh',
        background: 'var(--forest, #263a31)',
        padding: '24px 18px 60px',
      }}
    >
      <div className="staff-shell">
        <header className="staff-top">
          <div className="brand">
            <button
              type="button"
              onClick={() => setLogoUploadOpen(true)}
              title="Click to change logo"
              aria-label="Click to change logo"
              data-testid="button-change-logo"
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}assets/logo/CMInteriorLogoTransparentBG.png?v=${logoVersion}`}
                alt="CM Interiors Marketing logo"
                style={{
                  width: 48,
                  height: 48,
                  objectFit: 'contain',
                }}
              />
            </button>
            <span className="brand-copy">
              <span className="brand-name">CM INTERIORS MARKETING</span>
              <span className="brand-sub">Inquiry and project desk</span>
            </span>
          </div>
          <div className="staff-top-actions">
            {isSuperAdminRole(staffProfile.role) && (
              <button
                onClick={() => setStaffManagerOpen(true)}
                data-testid="button-manage-staff"
              >
                Manage staff
              </button>
            )}
            <button onClick={onClose} data-testid="button-exit-staff">
              Exit portal
            </button>
          </div>
        </header>

        <div className="staff-title">
          <div>
            <div className="eyebrow" style={{ color: '#d6e0da' }}>
              Good morning, team
            </div>
            <h1>Project desk.</h1>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'end',
              gap: 22,
              flexWrap: 'wrap',
              justifyContent: 'end',
            }}
          >
            <p style={{ margin: 0 }}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              <br />
              Davao City · showroom view
            </p>
            <button
              className="primary-button"
              onClick={openCreateQuotation}
              data-testid="button-create-quotation"
              style={{ whiteSpace: 'nowrap' }}
            >
              <FileText size={14} /> Create quotation
            </button>
            <button
              className="secondary-button"
              onClick={() => setHeroModalOpen(true)}
              data-testid="button-manage-hero-slides"
              style={{ whiteSpace: 'nowrap' }}
            >
              <ImagePlus size={14} /> Manage Hero Slides
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <span>New inquiries</span>
            <strong>
              {inquiryOrders.filter((order) => order.status === 'Quote Requested').length}
            </strong>
          </div>
          <div className="stat">
            <span>Draft quotes</span>
            <strong>
              {inquiryOrders.filter((order) => order.status === 'Draft Quote').length}
            </strong>
          </div>
          <div className="stat">
            <span>Ready to install</span>
            <strong>
              {
                activeOrders.filter(
                  (order) => order.status === 'Ready for Installation',
                ).length
              }
            </strong>
          </div>
          <div className="stat">
            <span>Catalog lines</span>
            <strong>{products.length}</strong>
          </div>
        </div>

        <div
          className="staff-panels"
          style={{
            display: 'grid',
            gap: '20px',
            alignItems: 'stretch',
          }}
        >
          <section className="staff-panel">
            <div className="panel-head" style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <h2>Inquiry review</h2>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--muted-ink)',
                    fontSize: 10,
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  Custom requests waiting for a considered response
                </span>
              </div>
              <span
                style={{
                  color: 'var(--muted-ink)',
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                {inquiryOrders.length} logged
              </span>
            </div>
            {inquiryOrders.length > 0 ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {inquiryOrders.map((order) => {
                  const isExpanded = Boolean(expandedOrderIds[order.id]);
                  return (
                    <article
                      key={order.id}
                      style={{
                        minWidth: 0,
                        border: '1px solid var(--sand)',
                        background: '#faf8f5',
                        padding: 14,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleOrderExpanded(order.id)}
                        aria-expanded={isExpanded}
                        style={{
                          display: 'flex',
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 14,
                          flexWrap: 'wrap',
                          padding: 0,
                          border: 0,
                          background: 'transparent',
                          color: 'inherit',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: '1 1 230px' }}>
                          <strong
                            style={{
                              display: 'block',
                              color: 'var(--obsidian)',
                              fontSize: 14,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {order.client}
                          </strong>
                          <span
                            style={{
                              display: 'block',
                              color: 'var(--muted-ink)',
                              fontSize: 10,
                              marginTop: 4,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {order.forDescription || 'Custom interior inquiry'}
                          </span>
                          <small
                            style={{
                              display: 'block',
                              color: 'var(--muted-ink)',
                              marginTop: 5,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {order.id}
                          </small>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              color:
                                order.status === 'Draft Quote'
                                  ? 'var(--sage)'
                                  : 'var(--crimson)',
                              border: '1px solid currentColor',
                              padding: '5px 7px',
                              fontSize: 9,
                              letterSpacing: '.06em',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {order.status}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: 'var(--crimson)',
                              fontSize: 10,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <ChevronDown
                              size={14}
                              style={{
                                transform: isExpanded ? 'rotate(180deg)' : undefined,
                                transition: 'transform 160ms ease',
                              }}
                            />
                            {isExpanded ? 'Hide details' : 'View details'}
                          </span>
                        </div>
                      </button>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginTop: 14,
                        }}
                      >
                        <button
                          className="table-action"
                          onClick={() => openInquiry(order)}
                          data-testid={`button-review-inquiry-${order.id}`}
                        >
                          <MessageCircle size={12} /> Review inquiry
                        </button>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            display: 'grid',
                            gap: 14,
                            marginTop: 14,
                            paddingTop: 14,
                            borderTop: '1px solid var(--sand)',
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: 12,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <span className="eyebrow">Items</span>
                              <strong style={{ display: 'block', marginTop: 5, fontSize: 14 }}>
                                {order.items.length}
                              </strong>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span className="eyebrow">Contact</span>
                              <span
                                style={{
                                  display: 'block',
                                  marginTop: 5,
                                  color: 'var(--muted-ink)',
                                  fontSize: 10,
                                  lineHeight: 1.5,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {inquiryContact(order) || 'Contact details pending'}
                              </span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span className="eyebrow">Address</span>
                              <span
                                style={{
                                  display: 'block',
                                  marginTop: 5,
                                  color: 'var(--muted-ink)',
                                  fontSize: 10,
                                  lineHeight: 1.5,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {order.address || 'Installation address pending'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            <span className="eyebrow">Requested items</span>
                            {order.items.length > 0 ? (
                              order.items.map((item, itemIndex) => {
                                const title = itemDisplayName(item);
                                const areas = areaSummary(item);
                                return (
                                  <div
                                    key={`${order.id}-inquiry-item-${item.id || itemIndex}`}
                                    style={{
                                      minWidth: 0,
                                      borderLeft: '2px solid var(--sand)',
                                      paddingLeft: 10,
                                    }}
                                  >
                                    <strong
                                      style={{
                                        display: 'block',
                                        color: 'var(--obsidian)',
                                        fontSize: 11,
                                        overflowWrap: 'anywhere',
                                      }}
                                    >
                                      {title}
                                      {item.subOption ? ` · ${item.subOption}` : ''}
                                    </strong>
                                    <span
                                      style={{
                                        display: 'block',
                                        color: 'var(--muted-ink)',
                                        fontSize: 10,
                                        marginTop: 2,
                                        overflowWrap: 'anywhere',
                                      }}
                                    >
                                      {item.category || 'Other'} · Areas:{' '}
                                      {areas || '—'} · Qty {itemTotalQuantity(item)}
                                    </span>
                                    {item.customNotes && (
                                      <span
                                        style={{
                                          display: 'block',
                                          color: 'var(--muted-ink)',
                                          fontSize: 10,
                                          marginTop: 2,
                                          overflowWrap: 'anywhere',
                                        }}
                                      >
                                        {item.customNotes}
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <span style={{ color: 'var(--muted-ink)', fontSize: 11 }}>
                                No line items recorded.
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No custom inquiries are waiting for review.</div>
            )}
          </section>



          <section className="staff-panel">
            <div className="panel-head" style={{ alignItems: 'flex-start' }}>
              <h2>Active fulfillment</h2>
              <span
                style={{
                  color: 'var(--muted-ink)',
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                {activeOrders.length} confirmed or in progress
              </span>
            </div>
            {activeOrders.length > 0 ? (
              <div style={{ display: 'grid', gap: 14 }}>
                {activeOrders.map((order) => {
                  const draft = getDraft(order);
                  const saveState = rowSaveStates[order.id];
                  const isDirty = Boolean(dirtyOrders[order.id]);
                  const isExpanded = Boolean(expandedOrderIds[order.id]);
                  const hasCurrentStatus = orderStatuses.includes(draft.status);
                  return (
                    <article
                      key={order.id}
                      style={{
                        minWidth: 0,
                        border: '1px solid var(--sand)',
                        background: '#faf8f5',
                        padding: 14,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleOrderExpanded(order.id)}
                        aria-expanded={isExpanded}
                        style={{
                          display: 'flex',
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 14,
                          flexWrap: 'wrap',
                          padding: 0,
                          border: 0,
                          background: 'transparent',
                          color: 'inherit',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                          <strong
                            style={{
                              display: 'block',
                              fontSize: 14,
                              color: 'var(--obsidian)',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {order.client}
                          </strong>
                          <span
                            style={{
                              display: 'block',
                              color: 'var(--muted-ink)',
                              fontSize: 10,
                              marginTop: 4,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {order.forDescription || order.product || 'Confirmed order'}
                          </span>
                          <small
                            style={{
                              display: 'block',
                              color: 'var(--muted-ink)',
                              marginTop: 5,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {order.id}
                          </small>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              color: 'var(--sage)',
                              border: '1px solid currentColor',
                              padding: '5px 7px',
                              fontSize: 9,
                              letterSpacing: '.06em',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {draft.status}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              color: 'var(--crimson)',
                              fontSize: 10,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <ChevronDown
                              size={14}
                              style={{
                                transform: isExpanded
                                  ? 'rotate(180deg)'
                                  : undefined,
                                transition: 'transform 160ms ease',
                              }}
                            />
                            {isExpanded ? 'Hide details' : 'View details'}
                          </span>
                        </div>
                      </button>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginTop: 14,
                        }}
                      >
                        <button
                          className="table-action"
                          onClick={() => openOrderEditor(order)}
                          data-testid={`button-edit-confirmed-order-${order.id}`}
                        >
                          <Pencil size={12} /> Edit order
                        </button>
                        <button
                          className="table-action"
                          onClick={() => void deleteOrder(order)}
                          data-testid={`button-delete-confirmed-order-card-${order.id}`}
                          style={{ color: '#b24949' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 14,
                            borderTop: '1px solid var(--sand)',
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                              gap: 10,
                            }}
                          >
                            <label
                              style={{
                                minWidth: 0,
                                color: 'var(--muted-ink)',
                                fontSize: 10,
                                letterSpacing: '.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Status
                              <select
                                value={draft.status}
                                onChange={(event) => updateDraft(order, { status: event.target.value })}
                                aria-label={`Status for ${order.id}`}
                                data-testid={`select-status-${order.id}`}
                                style={{ ...inputStyle, marginTop: 6 }}
                              >
                                {!hasCurrentStatus && (
                                  <option value={draft.status}>{draft.status}</option>
                                )}
                                {orderStatuses
                                  .filter((status) => !inquiryStatuses.includes(status))
                                  .map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label
                              style={{
                                minWidth: 0,
                                color: 'var(--muted-ink)',
                                fontSize: 10,
                                letterSpacing: '.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Courier
                              <input
                                type="text"
                                value={draft.courier}
                                onChange={(event) => updateDraft(order, { courier: event.target.value })}
                                placeholder="LBC / JRS"
                                aria-label={`Courier for ${order.id}`}
                                data-testid={`input-courier-${order.id}`}
                                style={{ ...inputStyle, marginTop: 6 }}
                              />
                            </label>
                            <label
                              style={{
                                minWidth: 0,
                                color: 'var(--muted-ink)',
                                fontSize: 10,
                                letterSpacing: '.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Main waybill
                              <input
                                type="text"
                                value={
                                  draft.items.find((item) => item.waybillNumber)?.waybillNumber ||
                                  order.waybillNumber
                                }
                                readOnly
                                placeholder="See item waybills"
                                aria-label={`Main waybill number for ${order.id}`}
                                style={{ ...inputStyle, marginTop: 6 }}
                              />
                            </label>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gap: 9,
                              marginTop: 14,
                              paddingTop: 12,
                              borderTop: '1px solid var(--sand)',
                            }}
                          >
                            <span className="eyebrow">Item tracking numbers</span>
                            {draft.items.length > 0 ? (
                              draft.items.map((item, itemIndex) => {
                                const title = itemDisplayName(item);
                                const areas = areaSummary(item);
                                return (
                                  <div
                                    key={`${order.id}-item-${item.id || itemIndex}`}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 1.4fr)',
                                      gap: 10,
                                      alignItems: 'center',
                                    }}
                                  >
                                    <div
                                      style={{
                                        minWidth: 0,
                                        color: 'var(--obsidian)',
                                        fontSize: 11,
                                        overflowWrap: 'anywhere',
                                      }}
                                    >
                                      <strong
                                        style={{
                                          display: 'block',
                                          fontWeight: 700,
                                          wordBreak: 'normal',
                                        }}
                                      >
                                        {title}
                                        {item.subOption ? ` · ${item.subOption}` : ''}
                                      </strong>
                                      <span
                                        style={{
                                          display: 'block',
                                          color: 'var(--muted-ink)',
                                          marginTop: 2,
                                          fontSize: 10,
                                          overflowWrap: 'anywhere',
                                        }}
                                      >
                                        {item.category || 'Other'} · Areas: {areas || '—'}
                                      </span>
                                      {item.material && (
                                        <small
                                          style={{
                                            display: 'block',
                                            color: 'var(--muted-ink)',
                                            marginTop: 2,
                                          }}
                                        >
                                          Material: {item.material}
                                        </small>
                                      )}
                                      <small
                                        style={{
                                          display: 'block',
                                          color: 'var(--muted-ink)',
                                          marginTop: 2,
                                        }}
                                      >
                                        Qty {itemTotalQuantity(item)}
                                      </small>
                                    </div>
                                    <input
                                      type="text"
                                      value={item.waybillNumber ?? ''}
                                      onChange={(event) =>
                                        updateItemWaybill(order, itemIndex, event.target.value)
                                      }
                                      placeholder="Item tracking / waybill"
                                      aria-label={`Waybill for item ${itemIndex + 1} of ${order.id}`}
                                      data-testid={`input-item-waybill-${order.id}-${itemIndex}`}
                                      style={{ ...inputStyle, minWidth: 0 }}
                                    />
                                  </div>
                                );
                              })
                            ) : (
                              <span style={{ color: 'var(--muted-ink)', fontSize: 11 }}>
                                No line items recorded.
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'flex-start',
                              gap: 10,
                              flexWrap: 'wrap',
                              marginTop: 14,
                            }}
                          >
                            {rowSaveErrors[order.id] && (
                              <small
                                role="alert"
                                style={{
                                  flex: '1 1 220px',
                                  color: '#b24949',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {rowSaveErrors[order.id]}
                              </small>
                            )}
                            <button
                              className="table-action"
                              disabled={!isDirty || saveState === 'saving'}
                              onClick={() => void saveOrderUpdates(order)}
                              data-testid={`button-save-updates-${order.id}`}
                              style={{
                                color: isDirty ? 'var(--crimson)' : '#9d9993',
                                opacity:
                                  !isDirty || saveState === 'saving' ? 0.55 : 1,
                              }}
                            >
                              {saveState === 'saving' ? (
                                'Saving…'
                              ) : saveState === 'saved' ? (
                                <>
                                  <Check size={12} /> Saved
                                </>
                              ) : (
                                <>
                                  <Save size={12} /> Save Updates
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No confirmed orders have been saved yet.</div>
            )}
          </section>

          <section className="staff-panel" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-head">
              <h2>Catalog lines</h2>
              <button
                onClick={openNewProduct}
                data-testid="button-add-product"
              >
                + Add line
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ minWidth: 620 }}>
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>Source</th>
                    <th>Rate / sq. ft.</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <b>{product.name}</b>
                        <br />
                        <span style={{ color: 'var(--muted-ink)' }}>
                          {product.category}
                        </span>
                      </td>
                      <td>{product.supplier}</td>
                      <td>{peso(product.rate)}</td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            gap: 7,
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            className="table-action"
                            onClick={() => setProductEditor({ product })}
                            data-testid={`button-edit-${product.id}`}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            className="table-action"
                            onClick={() => void archiveProduct(product.id)}
                            data-testid={`button-delete-${product.id}`}
                            style={{ color: '#b24949' }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        {actionError && (
          <div
            role="alert"
            style={{
              color: '#fbeceb',
              border: '1px solid rgba(251,236,235,.35)',
              padding: '10px 12px',
              marginTop: 18,
              fontSize: 11,
            }}
          >
            {actionError}
          </div>
        )}
      </div>

      {heroModalOpen && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setHeroModalOpen(false);
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hero-slides-title"
            style={{
              maxHeight: '85vh',
              overflowY: 'auto',
              width: 'min(100%, 640px)',
            }}
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow">Homepage presentation</div>
                <h2 id="hero-slides-title">Manage Hero Slides</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setHeroModalOpen(false)}
                aria-label="Close hero slide manager"
                data-testid="button-close-hero-slides"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="panel-head">
                <div>
                  <span
                    style={{
                      display: 'block',
                      color: 'var(--muted-ink)',
                      fontSize: 10,
                      marginTop: 4,
                    }}
                  >
                    Banner images shown in the homepage slideshow
                  </span>
                </div>
                <button
                  onClick={() => setHeroUploadOpen(true)}
                  data-testid="button-add-hero-image"
                >
                  <ImagePlus size={13} /> Add Image
                </button>
              </div>
              {heroImagesLoading ? (
                <div className="empty-state">Loading hero images…</div>
              ) : heroImages.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12,
                  }}
                >
                  {heroImages.map((image) => (
                    <article
                      key={image.id}
                      style={{
                        border: '1px solid var(--sand)',
                        background: '#faf8f5',
                      }}
                    >
                      <img
                        src={publicHeroUrl(image.path)}
                        alt={image.altText}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 130,
                          objectFit: 'cover',
                          background: '#e7ded2',
                        }}
                      />
                      <div style={{ padding: '11px 12px 12px' }}>
                        <strong
                          style={{
                            display: 'block',
                            color: 'var(--obsidian)',
                            fontSize: 12,
                            lineHeight: 1.35,
                          }}
                        >
                          {image.altText}
                        </strong>
                        <span
                          style={{
                            display: 'block',
                            color: 'var(--muted-ink)',
                            fontSize: 10,
                            marginTop: 5,
                            wordBreak: 'break-all',
                          }}
                        >
                          {image.path}
                        </span>
                        <button
                          className="table-action"
                          onClick={() => void removeHeroImage(image)}
                          data-testid={`button-remove-hero-${image.id}`}
                          style={{ color: '#b24949', marginTop: 10 }}
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  No custom hero slides active. Default catalog lines will be shown.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedInquiry && inquiryDraft && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeInquiry();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-review-title"
            style={{ width: 'min(100%, 1120px)' }}
          >
            <div className="modal-head">
              <div>
                <div
                  style={{
                    color: 'var(--crimson)',
                    fontSize: 10,
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: 5,
                  }}
                >
                  Custom inquiry · {selectedInquiry.status}
                </div>
                <h2 id="inquiry-review-title">
                  {selectedInquiry.client}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={closeInquiry}
                disabled={inquirySaveState === 'saving'}
                aria-label="Close inquiry review"
                data-testid="button-close-inquiry-review"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  paddingBottom: 17,
                  borderBottom: '1px solid var(--sand)',
                }}
              >
                <div>
                  <span className="eyebrow">Contact details</span>
                  <p
                    style={{
                      margin: '6px 0 0',
                      color: 'var(--obsidian)',
                      fontSize: 11,
                      lineHeight: 1.6,
                    }}
                  >
                    {inquiryContact(selectedInquiry) || 'No contact details'}
                  </p>
                </div>
                <label
                  style={{
                    color: 'var(--muted-ink)',
                    fontSize: 10,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Project description
                  <input
                    value={inquiryDraft.forDescription}
                    onChange={(event) =>
                      updateInquiry({ forDescription: event.target.value })
                    }
                    style={{ ...inputStyle, marginTop: 6 }}
                    data-testid="input-inquiry-project-description"
                  />
                </label>
                <label
                  style={{
                    color: 'var(--muted-ink)',
                    fontSize: 10,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Address / installation area
                  <input
                    value={inquiryDraft.address}
                    onChange={(event) =>
                      updateInquiry({ address: event.target.value })
                    }
                    placeholder="Add when confirmed"
                    style={{ ...inputStyle, marginTop: 6 }}
                    data-testid="input-inquiry-address"
                  />
                </label>
              </div>

              {(inquiryDraft.items[0]?.photos?.length ?? 0) > 0 && (
                <div
                  style={{
                    marginTop: 17,
                    paddingBottom: 17,
                    borderBottom: '1px solid var(--sand)',
                  }}
                >
                  <span className="eyebrow">Reference photos from the customer</span>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    {inquiryDraft.items[0]?.photos?.map((photoUrl) => (
                      <button
                        key={photoUrl}
                        type="button"
                        onClick={() => setLightboxPhoto(photoUrl)}
                        aria-label="Enlarge photo"
                        style={{
                          width: 84,
                          height: 84,
                          padding: 0,
                          border: '1px solid var(--sand)',
                          overflow: 'hidden',
                          cursor: 'zoom-in',
                        }}
                      >
                        <img
                          src={photoUrl}
                          alt="Customer reference"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'end',
                  gap: 12,
                  margin: '20px 0 10px',
                }}
              >
                <div>
                  <div className="eyebrow">Draft quote builder</div>
                  <h3
                    style={{
                      margin: '5px 0 0',
                      font: '600 21px var(--app-font-serif)',
                    }}
                  >
                    Shape the right response
                  </h3>
                </div>
                <span style={{ color: 'var(--muted-ink)', fontSize: 11 }}>
                  Area amount = quantity × unit price
                </span>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {inquiryDraft.items.map((item, itemIndex) => {
                  const subOptions = categorySubOptions[item.category ?? 'Other'] ?? [];
                  const areas = areasOf(item);
                  return (
                    <div
                      key={item.id || itemIndex}
                      style={{
                        border: '1px solid var(--sand)',
                        background: 'white',
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <label
                          style={{
                            color: 'var(--muted-ink)',
                            fontSize: 10,
                            letterSpacing: '.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Item name
                          <input
                            value={item.itemName ?? ''}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                itemName: event.target.value,
                              })
                            }
                            placeholder="Curtains Thick Drapes B.O Only"
                            style={{ ...inputStyle, marginTop: 6 }}
                            aria-label={`Item name for item ${itemIndex + 1}`}
                            data-testid={`input-draft-item-name-${itemIndex}`}
                          />
                        </label>
                        <label
                          style={{
                            color: 'var(--muted-ink)',
                            fontSize: 10,
                            letterSpacing: '.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Category
                          <select
                            value={item.category ?? 'Other'}
                            onChange={(event) =>
                              setInquiryItemCategory(
                                itemIndex,
                                event.target.value as InquiryCategory,
                              )
                            }
                            style={{ ...inputStyle, marginTop: 6 }}
                            aria-label={`Category for inquiry item ${itemIndex + 1}`}
                            data-testid={`select-draft-category-${itemIndex}`}
                          >
                            {inquiryCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>
                        {subOptions.length > 0 && (
                          <label
                            style={{
                              color: 'var(--muted-ink)',
                              fontSize: 10,
                              letterSpacing: '.08em',
                              textTransform: 'uppercase',
                            }}
                          >
                            Finish / opacity
                            <select
                              value={item.subOption ?? ''}
                              onChange={(event) =>
                                updateInquiryItem(itemIndex, {
                                  subOption: event.target.value,
                                })
                              }
                              style={{ ...inputStyle, marginTop: 6 }}
                              aria-label={`Finish for inquiry item ${itemIndex + 1}`}
                              data-testid={`select-draft-suboption-${itemIndex}`}
                            >
                              {subOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label
                          style={{
                            color: 'var(--muted-ink)',
                            fontSize: 10,
                            letterSpacing: '.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Verified material
                          <input
                            value={item.material}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                material: event.target.value,
                              })
                            }
                            placeholder="Assign material"
                            style={{ ...inputStyle, marginTop: 6 }}
                            aria-label={`Verified material for inquiry item ${itemIndex + 1}`}
                            data-testid={`input-draft-material-${itemIndex}`}
                          />
                        </label>
                        <label
                          style={{
                            color: 'var(--muted-ink)',
                            fontSize: 10,
                            letterSpacing: '.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Supplier
                          <input
                            value={item.supplier ?? ''}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                supplier: event.target.value,
                              })
                            }
                            placeholder="Warehouse / partner"
                            style={{ ...inputStyle, marginTop: 6 }}
                            aria-label={`Supplier for inquiry item ${itemIndex + 1}`}
                            data-testid={`input-draft-supplier-${itemIndex}`}
                          />
                        </label>
                      </div>

                      <label
                        style={{
                          display: 'block',
                          color: 'var(--muted-ink)',
                          fontSize: 10,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          marginBottom: 10,
                        }}
                      >
                        Customer notes
                        <textarea
                          value={item.customNotes ?? ''}
                          onChange={(event) =>
                            updateInquiryItem(itemIndex, {
                              customNotes: event.target.value,
                            })
                          }
                          placeholder="Blackout, rough measurements..."
                          rows={2}
                          style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }}
                          aria-label={`Notes for inquiry item ${itemIndex + 1}`}
                          data-testid={`textarea-draft-notes-${itemIndex}`}
                        />
                      </label>

                      <div style={{ overflowX: 'auto', border: '1px solid var(--sand)' }}>
                        <table className="admin-table" style={{ minWidth: 720, background: 'white' }}>
                          <thead>
                            <tr>
                              <th style={{ width: 220 }}>Room / area</th>
                              <th>W (in)</th>
                              <th>H (in)</th>
                              <th>Qty</th>
                              <th>Unit price</th>
                              <th>Amount</th>
                              <th aria-label="Remove area" />
                            </tr>
                          </thead>
                          <tbody>
                            {areas.map((area, areaIndex) => (
                              <tr key={area.id || areaIndex}>
                                <td>
                                  <input
                                    value={area.area}
                                    onChange={(event) =>
                                      updateInquiryArea(itemIndex, areaIndex, {
                                        area: event.target.value,
                                      })
                                    }
                                    placeholder="Living room small windows"
                                    style={inputStyle}
                                    aria-label={`Area name ${areaIndex + 1} for item ${itemIndex + 1}`}
                                    data-testid={`input-draft-area-name-${itemIndex}-${areaIndex}`}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={area.width || ''}
                                    onChange={(event) =>
                                      updateInquiryArea(itemIndex, areaIndex, {
                                        width: Math.max(0, numberValue(event.target.value)),
                                      })
                                    }
                                    style={{ ...inputStyle, width: 74 }}
                                    aria-label={`Width for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                    data-testid={`input-draft-area-width-${itemIndex}-${areaIndex}`}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={area.height || ''}
                                    onChange={(event) =>
                                      updateInquiryArea(itemIndex, areaIndex, {
                                        height: Math.max(0, numberValue(event.target.value)),
                                      })
                                    }
                                    style={{ ...inputStyle, width: 74 }}
                                    aria-label={`Height for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                    data-testid={`input-draft-area-height-${itemIndex}-${areaIndex}`}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={area.quantity || ''}
                                    onChange={(event) =>
                                      updateInquiryArea(itemIndex, areaIndex, {
                                        quantity: Math.max(
                                          1,
                                          Math.trunc(numberValue(event.target.value)),
                                        ),
                                      })
                                    }
                                    style={{ ...inputStyle, width: 64 }}
                                    aria-label={`Quantity for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                    data-testid={`input-draft-area-quantity-${itemIndex}-${areaIndex}`}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={area.unitPrice || ''}
                                    onChange={(event) =>
                                      updateInquiryArea(itemIndex, areaIndex, {
                                        unitPrice: Math.max(0, numberValue(event.target.value)),
                                      })
                                    }
                                    style={{ ...inputStyle, width: 92 }}
                                    aria-label={`Unit price for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                    data-testid={`input-draft-area-unit-price-${itemIndex}-${areaIndex}`}
                                  />
                                </td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                                  {peso(areaAmount(area))}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="table-action"
                                    onClick={() => removeInquiryArea(itemIndex, areaIndex)}
                                    disabled={areas.length === 1}
                                    aria-label={`Remove area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                    data-testid={`button-remove-draft-area-${itemIndex}-${areaIndex}`}
                                    style={{ opacity: areas.length === 1 ? 0.35 : 1 }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 10,
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => addInquiryArea(itemIndex)}
                          data-testid={`button-add-draft-area-${itemIndex}`}
                        >
                          <Plus size={14} /> Add another room / area
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted-ink)' }}>
                            Item subtotal{' '}
                            <b style={{ color: 'var(--obsidian)' }}>{peso(itemAmount(item))}</b>
                          </span>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => removeInquiryItem(itemIndex)}
                            disabled={inquiryDraft.items.length === 1}
                            aria-label={`Remove item ${itemIndex + 1}`}
                            data-testid={`button-remove-draft-item-${itemIndex}`}
                            style={{ color: '#b24949', opacity: inquiryDraft.items.length === 1 ? 0.35 : 1 }}
                          >
                            <Trash2 size={13} /> Remove item
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="text-button"
                onClick={addInquiryItem}
                data-testid="button-add-draft-item"
                style={{ marginTop: 12 }}
              >
                <Plus size={14} /> Add another quoted item
              </button>

              {(() => {
                const totalPhp = inquiryDraft.items.reduce(
                  (sum, item) => sum + itemAmount(item),
                  0,
                );
                const discount = Math.max(0, numberValue(inquiryDraft.discount));
                const subTotal = Math.max(0, totalPhp - discount);
                const delivery = Math.max(
                  0,
                  numberValue(inquiryDraft.deliveryMobilization),
                );
                const grandTotal = subTotal + delivery;
                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: 22,
                    }}
                  >
                    <div
                      style={{
                        width: 'min(100%, 390px)',
                        borderTop: '1px solid var(--obsidian)',
                        paddingTop: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: 'var(--muted-ink)',
                          fontSize: 11,
                          marginBottom: 9,
                        }}
                      >
                        <span>Total materials</span>
                        <b style={{ color: 'var(--obsidian)' }}>
                          {peso(totalPhp)}
                        </b>
                      </div>
                      <label
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          color: 'var(--muted-ink)',
                          fontSize: 11,
                          marginBottom: 9,
                        }}
                      >
                        <span>Discount</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inquiryDraft.discount || ''}
                          onChange={(event) =>
                            updateInquiry({
                              discount: Math.max(
                                0,
                                numberValue(event.target.value),
                              ),
                            })
                          }
                          style={{ ...inputStyle, width: 150 }}
                          aria-label="Inquiry discount"
                          data-testid="input-inquiry-discount"
                        />
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: 'var(--muted-ink)',
                          fontSize: 11,
                          marginBottom: 9,
                        }}
                      >
                        <span>Sub total</span>
                        <b style={{ color: 'var(--obsidian)' }}>
                          {peso(subTotal)}
                        </b>
                      </div>
                      <label
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          color: 'var(--muted-ink)',
                          fontSize: 11,
                        }}
                      >
                        <span>Delivery and mobilization</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inquiryDraft.deliveryMobilization || ''}
                          onChange={(event) =>
                            updateInquiry({
                              deliveryMobilization: Math.max(
                                0,
                                numberValue(event.target.value),
                              ),
                            })
                          }
                          style={{ ...inputStyle, width: 150 }}
                          aria-label="Inquiry delivery and mobilization"
                          data-testid="input-inquiry-delivery"
                        />
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          borderTop: '1px solid var(--obsidian)',
                          paddingTop: 12,
                          marginTop: 12,
                        }}
                      >
                        <strong style={{ fontSize: 11 }}>Grand total</strong>
                        <strong
                          style={{
                            font: '600 24px var(--app-font-serif)',
                          }}
                        >
                          {peso(grandTotal)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {inquirySaveError && (
                <div
                  role="alert"
                  style={{
                    color: 'var(--crimson)',
                    background: '#fbeceb',
                    padding: '10px 12px',
                    marginTop: 18,
                    fontSize: 11,
                  }}
                >
                  {inquirySaveError}
                </div>
              )}
              {inquiryExportError && (
                <div
                  role="alert"
                  style={{
                    color: 'var(--crimson)',
                    background: '#fbeceb',
                    padding: '10px 12px',
                    marginTop: 18,
                    fontSize: 11,
                    overflowWrap: 'anywhere',
                  }}
                >
                  Export error: {inquiryExportError}
                </div>
              )}
              {inquirySaveState === 'saved' && (
                <div
                  role="status"
                  style={{
                    color: 'var(--sage)',
                    background: '#e5ebe7',
                    padding: '10px 12px',
                    marginTop: 18,
                    fontSize: 11,
                  }}
                >
                  {selectedInquiry
                    ? 'Draft saved to the inquiry.'
                    : 'Inquiry converted to the active fulfillment table.'}
                </div>
              )}
              <div
                className="quote-actions"
                style={{ marginTop: 22, flexWrap: 'wrap' }}
              >
                <button
                  type="button"
                  className="text-button"
                  onClick={closeInquiry}
                  disabled={inquirySaveState === 'saving'}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void exportInquiryToExcel()}
                  disabled={inquirySaveState === 'saving'}
                  data-testid="button-export-inquiry-excel"
                >
                  <FileDown size={14} /> Export to Excel
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void deleteOrder(selectedInquiry)}
                  disabled={inquirySaveState === 'saving'}
                  style={{ color: '#b24949' }}
                  data-testid="button-delete-inquiry-review"
                >
                  <Trash2 size={14} /> Delete inquiry
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void saveInquiry(false)}
                  disabled={inquirySaveState === 'saving'}
                  data-testid="button-save-inquiry-draft"
                >
                  <Save size={14} /> Save Draft
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void saveInquiry(true)}
                  disabled={inquirySaveState === 'saving'}
                  data-testid="button-convert-confirmed-order"
                >
                  <ArrowRight size={14} /> Continue to quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightboxPhoto && (
        <div
          className="overlay"
          onMouseDown={() => setLightboxPhoto('')}
          style={{ zIndex: 60 }}
        >
          <img
            src={lightboxPhoto}
            alt="Enlarged customer reference"
            style={{ maxWidth: '92vw', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}
          />
        </div>
      )}

      {quoteOpen && (
        <StaffQuoteModal
          key={quoteOrder?.id || 'new-quotation'}
          products={products}
          initialOrder={quoteOrder}
          mode={quoteMode}
          onClose={closeQuote}
          onDelete={quoteOrder ? () => void deleteOrder(quoteOrder) : undefined}
          onSave={(order) =>
            setOrders((current) =>
              current.some((currentOrder) => currentOrder.id === order.id)
                ? current.map((currentOrder) =>
                    currentOrder.id === order.id ? order : currentOrder,
                  )
                : [order, ...current],
            )
          }
        />
      )}
      {productEditor && (
        <StaffProductModal
          product={productEditor.product}
          onClose={() => setProductEditor(null)}
          onSaved={(product) =>
            saveProduct(product, productEditor.product?.id)
          }
        />
      )}
      {logoUploadOpen && (
        <LogoUploadModal
          onClose={() => setLogoUploadOpen(false)}
          onUploaded={() => setLogoVersion(Date.now())}
        />
      )}
      {heroUploadOpen && (
        <HeroUploadModal
          onClose={() => setHeroUploadOpen(false)}
          onUploaded={(image) => {
            setHeroImages((current) => {
              const next = [
                ...current.filter((existing) => existing.path !== image.path),
                image,
              ];
              writeStoredHeroImages(next);
              return next;
            });
            setHeroUploadOpen(false);
          }}
        />
      )}
      {staffManagerOpen && (
        <StaffAccessModal
          currentUser={staffProfile}
          onClose={() => setStaffManagerOpen(false)}
        />
      )}
    </div>
  );
}
