

import React, { useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { gsap } from "gsap";
import { Home, PlusSquare, BarChart2, Layers } from "lucide-react";

const Sidebar = () => {
  const sidebarRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sidebarRef.current, {
        x: -100,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      gsap.from(".nav-item", {
        x: -20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
        delay: 0.3,
      });
    }, sidebarRef);

    return () => ctx.revert();
  }, []);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <Home size={20} /> },
    { name: "Create Project", path: "/create-project", icon: <PlusSquare size={20} /> },
    { name: "Dev Stats", path: "/stats", icon: <BarChart2 size={20} /> },
  ];

  return (
    <div
      ref={sidebarRef}
      className="fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col z-50 text-white shadow-xl"
    >
      <div className="mb-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Layers size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            DevManager
          </h1>
          <p className="text-xs text-zinc-500">Project Suite</p>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
                isActive
                  ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/5 text-indigo-400 border border-indigo-500/20 shadow-md shadow-indigo-500/5"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50 hover:border-zinc-700/50 border border-transparent"
              }`
            }
          >
            <div className="flex items-center gap-3 w-full z-10">
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-800/30 border border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold ring-2 ring-zinc-900 shadow-lg">
            HR
          </div>
          <div>
            <p className="text-sm font-medium text-white">HR Admin</p>
            <p className="text-xs text-zinc-500">admin@corp.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
