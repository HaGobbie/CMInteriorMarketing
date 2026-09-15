import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { ImagePlus, UploadCloud, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { uploadSiteImage } from '@/lib/imageUpload';
import {
  mergeHeroImages,
  normalizeHeroImage,
  readStoredHeroImages,
  writeStoredHeroImages,
  type HeroImage,
} from '@/lib/heroImages';

type HeroUploadModalProps = {
  onClose: () => void;
  onUploaded: (image: HeroImage) => void;
};

export default function HeroUploadModal({
  onClose,
  onUploaded,
}: HeroUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (candidate: File | null) => {
    setSuccess('');
    setError('');
    if (!candidate) return;
    if (!candidate.type.startsWith('image/')) {
      setFile(null);
      setError('Please choose an image file such as PNG, JPG, or WebP.');
      return;
    }
    if (candidate.size > 20 * 1024 * 1024) {
      setFile(null);
      setError('Please choose an image smaller than 20 MB.');
      return;
    }
    setFile(candidate);
    setAltText((current) => current || candidate.name.replace(/\.[^.]+$/, ''));
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  };

  const uploadHeroImage = async () => {
    if (!file) {
      setError('Choose an image before uploading.');
      return;
    }

    setIsUploading(true);
    setSuccess('');
    setError('');

    try {
      // Resized to a max of 1280px and re-encoded to AVIF/WebP where the
      // browser supports it — same pipeline as the inquiry basket's
      // photo uploads — so hero slides don't balloon page weight.
      const { path: publicPath } = await uploadSiteImage(file, { folder: 'hero' });

      const { data: savedRow, error: saveError } = await supabase
        .from('hero_images')
        .insert({
          path: publicPath,
          alt_text: altText.trim() || 'CM Interiors architectural interior',
          sort_order: 0,
          is_active: true,
        })
        .select('id, path, alt_text, sort_order, is_active')
        .single();

      if (saveError) {
        throw new Error(
          `The image reached GitHub, but its hero record could not be saved: ${saveError.message}`,
        );
      }

      const image = normalizeHeroImage(
        (savedRow ?? {
          path: publicPath,
          alt_text: altText.trim(),
          sort_order: 0,
          is_active: true,
        }) as Record<string, unknown>,
      );
      writeStoredHeroImages(mergeHeroImages(readStoredHeroImages(), [image]));
      onUploaded(image);
      setSuccess('Hero image uploaded and added to the live slideshow.');
      setFile(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The hero image upload failed. Please try again.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isUploading) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hero-upload-modal-title"
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
              Staff content
            </div>
            <h2 id="hero-upload-modal-title">Add hero image</h2>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close hero image upload"
            data-testid="button-close-hero-upload"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p
            style={{
              color: 'var(--muted-ink)',
              fontSize: 12,
              lineHeight: 1.6,
              marginTop: 0,
            }}
          >
            The image is resized and compressed, then saved to the
            repository&apos;s <b>public/assets/hero/</b> folder and
            registered for the homepage slideshow.
          </p>

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
              border: `1px dashed ${
                isDragging ? 'var(--crimson)' : 'var(--sand)'
              }`,
              background: isDragging ? '#fbefed' : '#faf8f5',
              minHeight: 190,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              padding: 24,
              cursor: 'pointer',
            }}
            data-testid="dropzone-hero-upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              data-testid="input-hero-file"
            />
            {previewUrl ? (
              <div style={{ width: '100%' }}>
                <img
                  src={previewUrl}
                  alt="Selected hero preview"
                  style={{
                    display: 'block',
                    width: '100%',
                    maxHeight: 220,
                    objectFit: 'cover',
                  }}
                />
                <strong
                  style={{
                    display: 'block',
                    marginTop: 9,
                    fontSize: 13,
                    wordBreak: 'break-word',
                  }}
                >
                  {file?.name}
                </strong>
              </div>
            ) : (
              <div>
                <UploadCloud
                  size={30}
                  strokeWidth={1.5}
                  color="var(--crimson)"
                />
                <strong style={{ display: 'block', marginTop: 9 }}>
                  Drop a banner image here
                </strong>
                <span
                  style={{
                    display: 'block',
                    marginTop: 5,
                    color: 'var(--muted-ink)',
                    fontSize: 11,
                  }}
                >
                  or click to browse · PNG, JPG, WebP, or GIF · max 20 MB
                </span>
              </div>
            )}
          </div>

          <label
            style={{
              display: 'block',
              color: 'var(--muted-ink)',
              fontSize: 10,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              marginTop: 16,
            }}
          >
            Accessibility description
            <input
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="Warm layered curtains in a sunlit room"
              style={{
                width: '100%',
                border: '1px solid var(--sand)',
                background: 'white',
                color: 'var(--obsidian)',
                padding: '10px 11px',
                fontSize: 12,
                marginTop: 6,
              }}
              data-testid="input-hero-alt-text"
            />
          </label>

          {error && (
            <div
              role="alert"
              style={{
                color: 'var(--crimson)',
                background: '#fbeceb',
                padding: '10px 12px',
                marginTop: 18,
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              style={{
                color: 'var(--sage)',
                background: '#e5ebe7',
                padding: '10px 12px',
                marginTop: 18,
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              <ImagePlus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {success}
            </div>
          )}

          <div className="quote-actions" style={{ marginTop: 22 }}>
            <button
              type="button"
              className="text-button"
              onClick={onClose}
              disabled={isUploading}
            >
              Close
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void uploadHeroImage()}
              disabled={isUploading || !file}
              data-testid="button-upload-hero"
            >
              {isUploading ? 'Uploading…' : 'Upload hero image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
