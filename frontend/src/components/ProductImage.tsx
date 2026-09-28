interface Props {
  src: string | null
  alt: string
  className?: string
}

export function ProductImage({ src, alt, className = '' }: Props) {
  if (!src) return <div className={`product-image placeholder ${className}`} aria-hidden="true">No image</div>
  return <img className={`product-image ${className}`} src={src} alt={alt} loading="lazy" />
}
