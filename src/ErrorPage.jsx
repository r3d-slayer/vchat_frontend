import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

const ErrorPage = () => {
  let navigate = useNavigate();
  const logout = () => {
    navigate('/chat')
}

  return (
    <div className='Error-main-container'>
      <label htmlFor="Error" id='route_error'>No Page found</label>
      <Link to='/'>
      <button type="submit" onClick={logout} className="error-submit">Go Back</button>
      </Link>
    </div>
  )
}

export default ErrorPage
