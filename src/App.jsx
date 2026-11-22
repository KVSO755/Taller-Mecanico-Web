import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RutaProtegida from "./routes/RutaProtegida";
import { rutaInicioPorRol } from "./routes/rutaInicio";
import Layout from "./components/Layout";
import NoEncontrado from "./pages/NoEncontrado";
import Spinner from "./components/Spinner";
import LimiteError from "./components/LimiteError";

// Páginas cargadas por sección (auth, cliente, taller, admin).
const Login = lazy(() => import("./pages/auth/Login"));
const Registro = lazy(() => import("./pages/auth/Registro"));
const InicioCliente = lazy(() => import("./pages/cliente/Inicio"));
const NuevoVehiculo = lazy(() => import("./pages/cliente/NuevoVehiculo"));
const DetalleVehiculo = lazy(() => import("./pages/cliente/DetalleVehiculo"));
const NuevaCita = lazy(() => import("./pages/cliente/NuevaCita"));
const Citas = lazy(() => import("./pages/cliente/Citas"));
const Facturas = lazy(() => import("./pages/cliente/Facturas"));
const NuevaFactura = lazy(() => import("./pages/cliente/NuevaFactura"));
const FacturaPage = lazy(() => import("./pages/FacturaPage"));
const InicioTaller = lazy(() => import("./pages/taller/Inicio"));
const CitasTaller = lazy(() => import("./pages/taller/Citas"));
const Ordenes = lazy(() => import("./pages/taller/Ordenes"));
const NuevaOrden = lazy(() => import("./pages/taller/NuevaOrden"));
const DetalleOrden = lazy(() => import("./pages/taller/DetalleOrden"));
const HistorialVehiculo = lazy(
  () => import("./pages/taller/HistorialVehiculo"),
);
const Inventario = lazy(() => import("./pages/taller/Inventario"));
const DetallePieza = lazy(() => import("./pages/taller/DetallePieza"));
const Empleados = lazy(() => import("./pages/admin/Empleados"));

function Cargando() {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-3 p-8 text-tenue"
    >
      <Spinner />
      Cargando...
    </p>
  );
}

function Raiz() {
  const { sesion, perfil, cargando, errorPerfil } = useAuth();
  if (cargando) {
    return <Cargando />;
  }
  // Sesión válida pero el perfil no cargó (red): RutaProtegida mostrará el aviso con Reintentar.
  if (sesion && !perfil && errorPerfil)
    return <Navigate to="/cliente" replace />;
  return (
    <Navigate to={perfil ? rutaInicioPorRol(perfil.rol) : "/login"} replace />
  );
}

export default function App() {
  return (
    <LimiteError>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/" element={<Raiz />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />

            <Route element={<RutaProtegida roles={["cliente"]} />}>
              <Route element={<Layout />}>
                <Route path="/cliente" element={<InicioCliente />} />
                <Route
                  path="/cliente/vehiculos/nuevo"
                  element={<NuevoVehiculo />}
                />
                <Route
                  path="/cliente/vehiculos/:id"
                  element={<DetalleVehiculo />}
                />
                <Route path="/cliente/citas" element={<Citas />} />
                <Route path="/cliente/citas/nueva" element={<NuevaCita />} />
                <Route path="/cliente/facturas" element={<Facturas />} />
                <Route path="/cliente/facturas/nueva" element={<NuevaFactura />} />
                <Route path="/cliente/facturas/:id" element={<FacturaPage />} />
              </Route>
            </Route>

            <Route element={<RutaProtegida roles={["empleado", "admin"]} />}>
              <Route element={<Layout />}>
                <Route path="/taller" element={<InicioTaller />} />
                <Route path="/taller/citas" element={<CitasTaller />} />
                <Route path="/taller/ordenes" element={<Ordenes />} />
                <Route path="/taller/ordenes/nueva" element={<NuevaOrden />} />
                <Route path="/taller/ordenes/:id" element={<DetalleOrden />} />
                <Route path="/taller/facturas/:id" element={<FacturaPage />} />
                <Route path="/taller/inventario" element={<Inventario />} />
                <Route
                  path="/taller/inventario/:id"
                  element={<DetallePieza />}
                />
                <Route
                  path="/taller/vehiculos/:id"
                  element={<HistorialVehiculo />}
                />
              </Route>
            </Route>

            <Route element={<RutaProtegida roles={["admin"]} />}>
              <Route element={<Layout />}>
                <Route path="/admin/empleados" element={<Empleados />} />
              </Route>
            </Route>

            <Route path="*" element={<NoEncontrado />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </LimiteError>
  );
}
