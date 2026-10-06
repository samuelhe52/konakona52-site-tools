import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react'

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return <div className={classNames('card', className)} {...props} />
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'success'
}

export function Button({
  className,
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames('button', `button--${variant}`, className)}
      {...props}
    />
  )
}

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  trailingButton?: ReactNode
}

export function InputField({ className, label, trailingButton, ...props }: InputFieldProps) {
  return (
    <label className="url-field">
      <span className="url-field__label">{label}</span>
      <div className="url-input-wrap">
        <input
          aria-label={label}
          className={classNames('url-input', !!trailingButton && 'url-input--has-trailing', className)}
          {...props}
        />
        {trailingButton}
      </div>
    </label>
  )
}

type ToolHeaderProps = {
  index: string
  path: string
  title: string
  description: string
}

export function ToolHeader({ index, path, title, description }: ToolHeaderProps) {
  return (
    <header className="page-header">
      <p className="page-header__meta" aria-hidden="true">
        <span className="page-header__index">{index}</span>
        <span>{path}</span>
      </p>
      <h1 className="page-header__title">{title}</h1>
      <p className="page-header__lede">{description}</p>
    </header>
  )
}
