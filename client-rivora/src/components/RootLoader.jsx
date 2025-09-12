import { Outlet } from 'react-router-dom'

const RootLoader = () => {
  // const navigate = useNavigate()
  // const dispatch = useDispatch()

  // useEffect(() => {
  //   if (isTokenExpired()) {
  //     Cookies.remove('token')
  //     localStorage.clear()
  //     dispatch(logout())
  //     navigate('/login')
  //   }
  // }, [])

  return <Outlet />
}

export default RootLoader
