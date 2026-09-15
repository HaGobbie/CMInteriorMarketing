import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, UploadCloud, X } from 'lucide-react';
import { uploadSiteImage } from '@/lib/imageUpload';

type LogoUploadModalProps = {
  onClose: () => void;
  onUploaded?: () => void;
};

const LOGO_FILENAME = 'CMInteriorLogoTransparentBG.png';

export default function LogoUploadModal({
  onClose,
  onUploaded,
}: LogoUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const chooseFile = (candidate: File | null) => {
    setSuccess('');
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

  const uploadLogo = async () => {
    if (!file) {
      setError('Choose an image before uploading.');
      return;
    }

    setIsUploading(true);
    setSuccess('');
    setError('');

    try {
      // The logo keeps its exact filename and format (no resize/re-encode)
      // because a few places in the app reference
      // assets/logo/CMInteriorLogoTransparentBG.png directly rather than
      // looking the path up dynamically — changing the extension here
      // would break those. `overwrite: true` has the Edge Function look
      // up and reuse the existing file's sha so this replaces it in
      // place instead of erroring on a path that already exists.
      await uploadSiteImage(file, {
        folder: 'logo',
        filename: LOGO_FILENAME,
        overwrite: true,
        compress: false,
      });

      setSuccess(
        'Logo uploaded to the main branch. Refresh the public site to see the new image.',
      );
      onUploaded?.();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The logo upload failed. Please try again.',
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
        aria-labelledby="logo-upload-modal-title"
        style={{ width: 'min(100%, 560px)' }}
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
              Staff branding
            </div>
            <h2 id="logo-upload-modal-title">Change logo</h2>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close logo upload"
            data-testid="button-close-logo-upload"
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
            Upload a replacement image. It will overwrite the current
            <b> {LOGO_FILENAME}</b> file in the repository&apos;s main branch.
            Use a PNG with a transparent background to match the current logo.
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
              minHeight: 150,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              padding: 24,
              cursor: 'pointer',
              transition: 'border-color .2s, background .2s',
            }}
            data-testid="dropzone-logo-upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              data-testid="input-logo-file"
            />
            {file ? (
              <div>
                <ImagePlus
                  size={28}
                  strokeWidth={1.5}
                  color="var(--crimson)"
                />
                <strong
                  style={{
                    display: 'block',
                    marginTop: 9,
                    fontSize: 13,
                    wordBreak: 'break-word',
                  }}
                >
                  {file.name}
                </strong>
                <span
                  style={{
                    display: 'block',
                    marginTop: 5,
                    color: 'var(--muted-ink)',
                    fontSize: 11,
                  }}
                >
                  {(file.size / 1024).toFixed(1)} KB · Click to replace
                </span>
              </div>
            ) : (
              <div>
                <UploadCloud
                  size={30}
                  strokeWidth={1.5}
                  color="var(--muted-ink)"
                />
                <strong
                  style={{
                    display: 'block',
                    marginTop: 9,
                    fontSize: 13,
                  }}
                >
                  Drop a logo here or choose a file
                </strong>
                <span
                  style={{
                    display: 'block',
                    marginTop: 5,
                    color: 'var(--muted-ink)',
                    fontSize: 11,
                  }}
                >
                  PNG recommended · transparent background supported
                </span>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              style={{
                color: 'var(--crimson)',
                background: '#fbeceb',
                padding: '10px 12px',
                marginTop: 15,
                fontSize: 11,
                lineHeight: 1.5,
                display: 'flex',
                gap: 8,
                alignItems: 'start',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div
              role="status"
              style={{
                color: 'var(--sage)',
                background: '#e5ebe7',
                padding: '10px 12px',
                marginTop: 15,
                fontSize: 11,
                lineHeight: 1.5,
                display: 'flex',
                gap: 8,
                alignItems: 'start',
              }}
            >
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          <div
            className="quote-actions"
            style={{ marginTop: 22, justifyContent: 'flex-end' }}
          >
            <button
              className="secondary-button"
              onClick={onClose}
              disabled={isUploading}
              data-testid="button-cancel-logo-upload"
            >
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={() => void uploadLogo()}
              disabled={isUploading || !file}
              data-testid="button-upload-logo"
            >
              {isUploading ? 'Uploading…' : 'Upload logo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
