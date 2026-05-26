import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
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
}

export function InputField({ className, label, ...props }: InputFieldProps) {
  return (
    <label className="url-field">
      <span className="url-field__label">{label}</span>
      <input
        aria-label={label}
        className={classNames('url-input', className)}
        {...props}
      />
    </label>
  )
}
