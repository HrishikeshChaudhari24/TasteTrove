import { Link } from "react-router-dom";
import SearchOrder from "../features/order/SearchOrder";
import Username from "../features/user/Username";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { addUser, removeUser } from "./store/user";

function Header() {
  const [userAddress, setUserAddress] = useState("");
  const [userData, setUserData] = useState({});
  const userdata = useSelector((state) => state.userdata);
  const dispatch = useDispatch();

  const fetchUserAddress = async () => {
    try {
      const address = await getAddress(); // Replace with your actual API call to fetch user address
      setUserAddress(address);
    } catch (error) {
      console.error("Error fetching user address", error);
    }
  };

  function logout() {
    window.open("https://tastetrove.onrender.com/auth/logout", "_self");
    removeUserData(userData);
    setUserData("");
  }

  useEffect(() => {
    axios
      .get("https://tastetrove.onrender.com/users", { withCredentials: true })
      .then((response) => {
        console.log(response.data);
        setUserData(response.data);
        addUserData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching user data", error);
      });
  }, []);

  const addUserData = (payload) => {
    dispatch(addUser(payload));
  };

  const removeUserData = (payload) => {
    dispatch(removeUser(payload));
  };

  return (
    <header className="flex justify-between items-center border-b border-stone-200 bg-yellow-400 px-4 py-3 sm:px-6">
      <Link to="/" className="tracking-widest text-xl flex uppercase ml-3 font-extrabold">
        Taste<p className="text-red-500 font-extrabold">Trove</p>
      </Link>

      <div className="flex justify-between items-center space-x-16 px-4 font-semibold">
        <Link to="/">Home</Link>
        <Link to="/allListings">All Mess</Link>

        <SearchOrder />

        {userdata && userdata.length > 0 && userdata[0].Type === "Admin" && (
          <button>
            <a href={`/Adminprofile/${userdata[0]._id}`}>
              <FaUser className="cursor-pointer" />
            </a>
          </button>
        )}

        {userdata && userdata.length > 0 && userdata[0].Type === "User" && (
          <button>
            <a href={`/Userprofile/${userdata[0]._id}`}>
              <FaUser className="cursor-pointer" />
            </a>
          </button>
        )}

        {userdata.length === 0 && (
          <div className="hidden sm:flex items-center space-x-4">
            <Link to="/login" onClick={logout}>
              <FaUser className="cursor-pointer" />
            </Link>
          </div>
        )}

        {userdata.length > 0 && (
          <div className="flex items-center space-x-4" style={{ marginTop: "8px", marginRight: "10px" }}>
            <Username />
            <div className="relative">
              <button className="cursor-pointer" onClick={logout}>
                <Link to="/">
                  <FaSignOutAlt />
                </Link>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
