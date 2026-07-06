import React from 'react'

export default function Card({ children, className = '', title }) {
  return (
    <div className={`card ${className}`}> 
      {title && <div className="card-title">{title}</div>}
      <div className="card-body">{children}</div>
    </div>
  )
}
