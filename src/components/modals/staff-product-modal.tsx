import {
  useRef,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  UploadCloud,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Product, ProductCategory } from '@/lib/mockData';

type StaffProductModalProps = {
  product?: Product;
  onClose: () => void;
  onSaved: (product: Product) => void;
};

const DEFAULT_OWNER = 'hagobbie';
const DEFAULT_REPO = 'CMInteriorMarketing';
const PRODUCT_FOLDER = 'public/assets/productimage';

const categories: ProductCategory[] = [
  'Blinds',
  'Custom Curtains',
  'Carpets',
  'Wallpapers',
];

const getEnv = (key: string, fallback: string) => {
  const value = import.meta.env[key] as string | undefined;
  return value?.trim() || fallback;
};

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const separatorIndex = result.indexOf(',');
      if (separatorIndex === -1) {
        reject(new Error('The selected image could not be encoded.'));
        return;
      }
      resolve(result.slice(separatorIndex + 1));
    };
    reader.onerror = () =>
      reject(new Error('The selected image could not be read.'));
    reader.readAsDataURL(file);
  });

const responseMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as {
      message?: string;
      documentation_url?: string;
    };
    return (
      payload.message ||
      payload.documentation_url ||
      `GitHub returned HTTP ${response.status}.`
    );
  } catch {
    return `GitHub returned HTTP ${response.status}.`;
  }
};

const safeFilename = (filename: string) => {
  const normalized = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `product-${Date.now()}.jpg`;
};

const isExternalImage = (value: string) =>
  value.startsWith('http://') || value.startsWith('https://');

const imageSource = (value: string) =>
  !value
    ? ''
    : isExternalImage(value)
      ? value
      : `${import.meta.env.BASE_URL}${value.replace(/^\/+/, '')}`;

export default function StaffProductModal({
  product,
  onClose,
  onSaved,
}: StaffProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState<ProductCategory>(
    product?.category ?? 'Blinds',
  );
  const [description, setDescription] = useState(product?.description ?? '');
  const [rate, setRate] = useState<number | ''>(product?.rate ?? '');
  const [imagePath, setImagePath] = useState(
    product?.art?.startsWith('assets/') ? product.art : '',
  );
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const chooseFile = (candidate: File | null) => {
    setError('');
    if (!candidate) return;
    if (!candidate.type.startsWith('image/')) {
      setFile(null);
      setError('Please choose an image file such as PNG, JPG, or WebP.');
      return;
    }
    setFile(candidate);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  };

  const uploadProductImage = async (image: File) => {
    const token = getEnv('VITE_GITHUB_PAT', '');
    const owner = getEnv('VITE_GITHUB_OWNER', DEFAULT_OWNER);
    const repo = getEnv('VITE_GITHUB_REPO', DEFAULT_REPO);
    if (!token) {
      throw new Error(
        'VITE_GITHUB_PAT is not configured. Add it to your local .env file and GitHub Actions secrets.',
      );
    }

    const filename = safeFilename(image.name);
    const githubPath = `${PRODUCT_FOLDER}/${filename}`;
    const relativePath = `assets/productimage/${filename}`;
    const endpoint = `https://api.github.com/repos/${encodeURIComponent(
      owner,
    )}/${encodeURIComponent(repo)}/contents/${githubPath}`;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const currentFileResponse = await fetch(endpoint, { headers });
    let sha: string | undefined;
    if (currentFileResponse.ok) {
      const currentFile = (await currentFileResponse.json()) as {
        sha?: string;
      };
      sha = currentFile.sha;
      if (!sha) {
        throw new Error('GitHub did not return the existing image SHA.');
      }
    } else if (currentFileResponse.status !== 404) {
      throw new Error(
        `Unable to read the existing product image: ${await responseMessage(
          currentFileResponse,
        )}`,
      );
    }

    const content = await readFileAsBase64(image);
    const uploadResponse = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `${product ? 'Update' : 'Add'} product image ${filename}`,
        content,
        branch: 'main',
        ...(sha ? { sha } : {}),
      }),
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Unable to upload the product image: ${await responseMessage(
          uploadResponse,
        )}`,
      );
    }
    return relativePath;
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const trimmedName = name.trim();
    const numericRate = Number(rate);
    if (!trimmedName) {
      setError('Add a product name before saving.');
      return;
    }
    if (!Number.isFinite(numericRate) || numericRate < 0) {
      setError('Enter a valid non-negative price per square foot.');
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error(
          'Please sign in through Supabase Auth before editing the catalog.',
        );
      }

      const nextImagePath = file
        ? await uploadProductImage(file)
        : imagePath || null;
      const payload = {
        name: trimmedName,
        category,
        description: description.trim(),
        price_per_sqm: numericRate,
        image_url: nextImagePath,
        is_archived: false,
        ...(product ? {} : { created_by: user.id }),
      };

      const result = product
        ? await supabase
            .from('products')
            .update(payload)
            .eq('id', product.id)
            .select()
            .single()
        : await supabase.from('products').insert(payload).select().single();

      if (result.error) throw new Error(result.error.message);

      const row = (result.data ?? {}) as Record<string, unknown>;
      const savedProduct: Product = {
        id: String(row.id ?? product?.id ?? `product-${Date.now()}`),
        name: String(row.name ?? trimmedName),
        category:
          categories.includes(String(row.category) as ProductCategory)
            ? (String(row.category) as ProductCategory)
            : category,
        supplier: product?.supplier ?? 'Davao Warehouse',
        rate: Number(row.price_per_sqm ?? numericRate),
        description: String(row.description ?? description.trim()),
        art: String(row.image_url ?? nextImagePath ?? product?.art ?? 'art-blind'),
        tag: product?.tag ?? 'Catalog line',
      };
      onSaved(savedProduct);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'The product could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : imageSource(imagePath)),
    [file, imagePath],
  );

  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(preview);
    },
    [file, preview],
  );

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-product-modal-title"
        style={{ width: 'min(100%, 620px)' }}
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
              Catalog management
            </div>
            <h2 id="staff-product-modal-title">
              {product ? 'Edit product' : 'Add product'}
            </h2>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close product editor"
            data-testid="button-close-product-editor"
          >
            <X size={18} />
          </button>
        </div>
        <form className="modal-body" onSubmit={saveProduct}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Linen Roller"
                required
                data-testid="input-product-name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginTop: 6,
                  border: '1px solid var(--sand)',
                  borderRadius: 4,
                  background: 'white',
                  color: 'var(--obsidian)',
                  fontSize: 13,
                }}
              />
            </label>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              Category
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ProductCategory)
                }
                data-testid="select-product-category"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginTop: 6,
                  border: '1px solid var(--sand)',
                  borderRadius: 4,
                  background: 'white',
                  color: 'var(--obsidian)',
                  fontSize: 13,
                }}
              >
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              marginTop: 14,
            }}
          >
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A short description for the storefront."
              rows={4}
              data-testid="textarea-product-description"
              style={{
                width: '100%',
                padding: '10px 12px',
                marginTop: 6,
                border: '1px solid var(--sand)',
                borderRadius: 4,
                background: 'white',
                color: 'var(--obsidian)',
                fontSize: 13,
                resize: 'vertical',
              }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              marginTop: 14,
            }}
          >
            Price per sq. ft.
            <input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) =>
                setRate(
                  event.target.value === ''
                    ? ''
                    : Number(event.target.value),
                )
              }
              required
              data-testid="input-product-price"
              style={{
                width: '100%',
                padding: '10px 12px',
                marginTop: 6,
                border: '1px solid var(--sand)',
                borderRadius: 4,
                background: 'white',
                color: 'var(--obsidian)',
                fontSize: 13,
              }}
            />
          </label>

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 15,
              border: `1px dashed ${
                isDragging ? 'var(--crimson)' : 'var(--sand)'
              }`,
              background: isDragging ? '#fbefed' : '#faf8f5',
              minHeight: 105,
              padding: 15,
              marginTop: 16,
              cursor: 'pointer',
            }}
            data-testid="dropzone-product-image"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            {preview ? (
              <img
                src={preview}
                alt="Product preview"
                style={{
                  width: 78,
                  height: 78,
                  objectFit: 'cover',
                  border: '1px solid var(--sand)',
                }}
              />
            ) : (
              <ImagePlus size={28} color="var(--crimson)" />
            )}
            <div>
              <strong style={{ display: 'block', color: 'var(--obsidian)' }}>
                {file ? file.name : 'Upload product image'}
              </strong>
              <span
                style={{
                  display: 'block',
                  color: 'var(--muted-ink)',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                Saved to public/assets/productimage/
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: 'var(--crimson)',
                  fontSize: 11,
                  marginTop: 9,
                }}
              >
                <UploadCloud size={13} /> Choose file or drag it here
              </span>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'start',
                gap: 8,
                color: 'var(--crimson)',
                background: '#fbeceb',
                padding: '10px 12px',
                marginTop: 16,
                fontSize: 11,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div className="quote-actions" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="text-button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSaving}
              data-testid="button-save-product"
            >
              {isSaving ? (
                'Saving…'
              ) : (
                <>
                  <CheckCircle2 size={14} /> Save product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}