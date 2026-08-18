'use client'

import { useState, useRef, useEffect, ReactNode, ComponentType } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Check, Search, AlertCircle } from "lucide-react"

export interface SelectOption {
  value: string
  label: string | ReactNode
  description?: string
  icon?: ComponentType<{ className?: string }>
  disabled?: boolean
  badge?: string
}

export interface SelectProps {
  options?: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  error?: string
  disabled?: boolean
  className?: string
  containerClassName?: string
  searchable?: boolean
  name?: string
  id?: string
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

export default function Select({
  options = [],
  value: controlledValue,
  defaultValue = '',
  onChange,
  placeholder = 'Selecione uma opção...',
  label,
  required,
  error,
  disabled = false,
  className = '',
  containerClassName = '',
  searchable = false,
  name,
  id,
  size = 'md',
  children,
}: SelectProps) {
  const [internalValue, setInternalValue] = useState<string>(controlledValue ?? defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue

  // Extract options from children if passed as <option> tags
  const parsedOptions: SelectOption[] = [...options]
  if (parsedOptions.length === 0 && children) {
    const processChild = (child: any) => {
      if (child && child.type === 'option') {
        parsedOptions.push({
          value: String(child.props?.value ?? child.props?.children ?? ''),
          label: child.props?.children,
          disabled: Boolean(child.props?.disabled),
        })
      }
    }
    if (Array.isArray(children)) {
      children.forEach(processChild)
    } else {
      processChild(children)
    }
  }

  const selectedOption = parsedOptions.find((opt) => String(opt.value) === String(currentValue))

  const handleSelect = (val: string) => {
    if (!isControlled) {
      setInternalValue(val)
    }
    onChange?.(val)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle controlled value changes externally
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue)
    }
  }, [controlledValue])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const filteredOptions = searchable && searchQuery
    ? parsedOptions.filter((opt) =>
        typeof opt.label === 'string'
          ? opt.label.toLowerCase().includes(searchQuery.toLowerCase())
          : String(opt.value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : parsedOptions

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-4 py-3.5 text-base rounded-2xl',
  }[size]

  return (
    <div className={`relative w-full ${containerClassName}`} ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden Native Input for Forms */}
      {name && <input type="hidden" name={name} value={currentValue} id={id} />}

      {/* Select Trigger Button */}
      <motion.button
        type="button"
        whileTap={{ scale: disabled ? 1 : 0.99 }}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group flex w-full items-center justify-between border bg-white transition-all duration-200 outline-none
          dark:bg-slate-900/80 dark:text-white
          ${error 
            ? 'border-red-500 ring-2 ring-red-500/20' 
            : isOpen 
              ? 'border-violet-500 ring-2 ring-violet-500/20 dark:border-violet-500' 
              : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20'
          }
          ${disabled ? 'cursor-not-allowed opacity-50 bg-slate-100 dark:bg-slate-800' : 'cursor-pointer'}
          ${sizeClasses}
          ${className}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && <selectedOption.icon className="h-4 w-4 shrink-0 text-violet-500" />}
              <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {placeholder}
            </span>
          )}
        </span>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="ml-2 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.button>

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500 font-medium">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 right-0 z-50 mt-2 max-h-60 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95 dark:shadow-2xl dark:shadow-black/60"
            role="listbox"
          >
            {/* Search Bar */}
            {searchable && (
              <div className="relative mb-1.5 p-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder-slate-500"
                />
              </div>
            )}

            <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Nenhuma opção encontrada
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = String(option.value) === String(currentValue)
                  const OptionIcon = option.icon

                  return (
                    <motion.button
                      key={String(option.value)}
                      type="button"
                      whileHover={{ x: option.disabled ? 0 : 2 }}
                      onClick={() => !option.disabled && handleSelect(String(option.value))}
                      disabled={option.disabled}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-all duration-150
                        ${option.disabled 
                          ? 'cursor-not-allowed opacity-40' 
                          : isSelected 
                            ? 'bg-violet-500/15 text-violet-600 dark:bg-violet-500/25 dark:text-violet-300 font-semibold' 
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {OptionIcon && (
                          <OptionIcon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-violet-500' : 'text-slate-400'}`} />
                        )}
                        <div className="truncate">
                          <div className="truncate">{option.label}</div>
                          {option.description && (
                            <div className="text-[10px] opacity-70 font-normal truncate mt-0.5">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {option.badge && (
                          <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-400/20 dark:text-violet-300">
                            {option.badge}
                          </span>
                        )}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <Check className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Alias export for backward compatibility
export const SelectProp = Select