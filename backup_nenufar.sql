--
-- PostgreSQL database dump
--

\restrict SFHuLkUS6IUfThgBKC4iWOHG6t58ZgHCe3bFAIaKU0PIp5Ok9N9ymyP7WZfZtVR

-- Dumped from database version 18.3 (Postgres.app)
-- Dumped by pg_dump version 18.3 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: CanalVenta; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CanalVenta" AS ENUM (
    'WEB',
    'APP',
    'PRESENCIAL',
    'TELEFONO',
    'OTRO'
);


ALTER TYPE public."CanalVenta" OWNER TO postgres;

--
-- Name: CompraEstado; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CompraEstado" AS ENUM (
    'PENDIENTE',
    'COMPLETADA',
    'CANCELADA'
);


ALTER TYPE public."CompraEstado" OWNER TO postgres;

--
-- Name: ContenidoEstado; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ContenidoEstado" AS ENUM (
    'BORRADOR',
    'PUBLICADO',
    'OCULTO',
    'REPORTADO',
    'ELIMINADO'
);


ALTER TYPE public."ContenidoEstado" OWNER TO postgres;

--
-- Name: Dificultad; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Dificultad" AS ENUM (
    'FACIL',
    'MEDIA',
    'DURA',
    'LEGENDARIA'
);


ALTER TYPE public."Dificultad" OWNER TO postgres;

--
-- Name: EstadoCuenta; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EstadoCuenta" AS ENUM (
    'ACTIVA',
    'PENDIENTE_VERIFICACION',
    'SUSPENDIDA',
    'BLOQUEADA',
    'ELIMINADA'
);


ALTER TYPE public."EstadoCuenta" OWNER TO postgres;

--
-- Name: LikeTipo; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LikeTipo" AS ENUM (
    'LIKE'
);


ALTER TYPE public."LikeTipo" OWNER TO postgres;

--
-- Name: LogroTipo; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LogroTipo" AS ENUM (
    'COMPRA',
    'RESENA',
    'PROMOCION',
    'RESERVA',
    'OTRO'
);


ALTER TYPE public."LogroTipo" OWNER TO postgres;

--
-- Name: MetodoPago; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MetodoPago" AS ENUM (
    'TARJETA',
    'BIZUM',
    'EFECTIVO',
    'STRIPE',
    'OTRO'
);


ALTER TYPE public."MetodoPago" OWNER TO postgres;

--
-- Name: MotivoTx; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MotivoTx" AS ENUM (
    'RESENA_AUTOR',
    'RESENA_NEGOCIO',
    'LIKE',
    'LOGRO',
    'RESERVA',
    'OTRO'
);


ALTER TYPE public."MotivoTx" OWNER TO postgres;

--
-- Name: PagoEstado; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PagoEstado" AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'FALLIDO'
);


ALTER TYPE public."PagoEstado" OWNER TO postgres;

--
-- Name: PedidoEstado; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PedidoEstado" AS ENUM (
    'PENDIENTE',
    'COMPLETADO',
    'CANCELADO'
);


ALTER TYPE public."PedidoEstado" OWNER TO postgres;

--
-- Name: PostTipo; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PostTipo" AS ENUM (
    'RESENA',
    'PROMOCION',
    'LOGRO'
);


ALTER TYPE public."PostTipo" OWNER TO postgres;

--
-- Name: ReservaEstado; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReservaEstado" AS ENUM (
    'PENDIENTE',
    'CONFIRMADA',
    'CANCELADA',
    'COMPLETADA',
    'NO_SHOW'
);


ALTER TYPE public."ReservaEstado" OWNER TO postgres;

--
-- Name: RolGlobal; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RolGlobal" AS ENUM (
    'USUARIO',
    'MODERADOR',
    'ADMIN'
);


ALTER TYPE public."RolGlobal" OWNER TO postgres;

--
-- Name: RolNegocio; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RolNegocio" AS ENUM (
    'DUENO',
    'EMPLEADO'
);


ALTER TYPE public."RolNegocio" OWNER TO postgres;

--
-- Name: TipoDescuento; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TipoDescuento" AS ENUM (
    'PORCENTAJE',
    'IMPORTE_FIJO',
    'PACK',
    'DOS_X_UNO'
);


ALTER TYPE public."TipoDescuento" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Categoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Categoria" (
    id integer NOT NULL,
    nombre text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "eliminadoEn" timestamp(3) without time zone
);


ALTER TABLE public."Categoria" OWNER TO postgres;

--
-- Name: Categoria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Categoria_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Categoria_id_seq" OWNER TO postgres;

--
-- Name: Categoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Categoria_id_seq" OWNED BY public."Categoria".id;


--
-- Name: Comentario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Comentario" (
    id integer NOT NULL,
    contenido text NOT NULL,
    "usuarioId" integer NOT NULL,
    "postId" integer NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "eliminadoEn" timestamp(3) without time zone,
    estado public."ContenidoEstado" DEFAULT 'PUBLICADO'::public."ContenidoEstado" NOT NULL,
    "moderadoEn" timestamp(3) without time zone,
    "motivoModeracion" text
);


ALTER TABLE public."Comentario" OWNER TO postgres;

--
-- Name: Comentario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Comentario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Comentario_id_seq" OWNER TO postgres;

--
-- Name: Comentario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Comentario_id_seq" OWNED BY public."Comentario".id;


--
-- Name: Compra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Compra" (
    id integer NOT NULL,
    "pedidoId" integer NOT NULL,
    "usuarioId" integer NOT NULL,
    total numeric(10,2) NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado public."CompraEstado" DEFAULT 'PENDIENTE'::public."CompraEstado" NOT NULL,
    "negocioId" integer NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    moneda text DEFAULT 'EUR'::text NOT NULL
);


ALTER TABLE public."Compra" OWNER TO postgres;

--
-- Name: Compra_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Compra_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Compra_id_seq" OWNER TO postgres;

--
-- Name: Compra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Compra_id_seq" OWNED BY public."Compra".id;


--
-- Name: Like; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Like" (
    id integer NOT NULL,
    tipo public."LikeTipo" DEFAULT 'LIKE'::public."LikeTipo" NOT NULL,
    "usuarioId" integer NOT NULL,
    "postId" integer NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Like" OWNER TO postgres;

--
-- Name: Like_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Like_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Like_id_seq" OWNER TO postgres;

--
-- Name: Like_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Like_id_seq" OWNED BY public."Like".id;


--
-- Name: Logro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Logro" (
    id integer NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    "negocioId" integer,
    "recompensaPuntos" integer NOT NULL,
    umbral integer NOT NULL,
    "categoriaId" integer,
    dificultad public."Dificultad" DEFAULT 'FACIL'::public."Dificultad" NOT NULL,
    "productoId" integer,
    "subcategoriaId" integer,
    tipo public."LogroTipo" NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Logro" OWNER TO postgres;

--
-- Name: LogroUsuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LogroUsuario" (
    id integer NOT NULL,
    "logroId" integer NOT NULL,
    "usuarioId" integer NOT NULL,
    veces integer DEFAULT 0 NOT NULL,
    conseguido boolean DEFAULT false NOT NULL,
    "conseguidoEn" timestamp(3) without time zone,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LogroUsuario" OWNER TO postgres;

--
-- Name: LogroUsuario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."LogroUsuario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."LogroUsuario_id_seq" OWNER TO postgres;

--
-- Name: LogroUsuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."LogroUsuario_id_seq" OWNED BY public."LogroUsuario".id;


--
-- Name: Logro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Logro_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Logro_id_seq" OWNER TO postgres;

--
-- Name: Logro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Logro_id_seq" OWNED BY public."Logro".id;


--
-- Name: Negocio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Negocio" (
    id integer NOT NULL,
    nombre text NOT NULL,
    historia text,
    "fechaFundacion" timestamp(3) without time zone NOT NULL,
    direccion text,
    "categoriaId" integer NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    horario jsonb,
    "intervaloReserva" integer,
    "duenoId" integer NOT NULL,
    "subcategoriaId" integer,
    activo boolean DEFAULT true NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    ciudad text,
    "codigoPostal" text,
    "descripcionCorta" text,
    "eliminadoEn" timestamp(3) without time zone,
    "emailContacto" text,
    "fotoPerfil" text,
    "fotoPortada" text,
    instagram text,
    latitud numeric(9,6),
    longitud numeric(9,6),
    provincia text,
    telefono text,
    verificado boolean DEFAULT false NOT NULL,
    web text
);


ALTER TABLE public."Negocio" OWNER TO postgres;

--
-- Name: NegocioMiembro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NegocioMiembro" (
    id integer NOT NULL,
    "negocioId" integer NOT NULL,
    "usuarioId" integer NOT NULL,
    rol public."RolNegocio" DEFAULT 'EMPLEADO'::public."RolNegocio" NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."NegocioMiembro" OWNER TO postgres;

--
-- Name: NegocioMiembro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."NegocioMiembro_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."NegocioMiembro_id_seq" OWNER TO postgres;

--
-- Name: NegocioMiembro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."NegocioMiembro_id_seq" OWNED BY public."NegocioMiembro".id;


--
-- Name: Negocio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Negocio_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Negocio_id_seq" OWNER TO postgres;

--
-- Name: Negocio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Negocio_id_seq" OWNED BY public."Negocio".id;


--
-- Name: Pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pago" (
    id integer NOT NULL,
    "compraId" integer NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "metodoPago" public."MetodoPago" NOT NULL,
    estado public."PagoEstado" DEFAULT 'PENDIENTE'::public."PagoEstado" NOT NULL,
    "usuarioId" integer NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    moneda text DEFAULT 'EUR'::text NOT NULL,
    "refExterna" text
);


ALTER TABLE public."Pago" OWNER TO postgres;

--
-- Name: Pago_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Pago_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Pago_id_seq" OWNER TO postgres;

--
-- Name: Pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Pago_id_seq" OWNED BY public."Pago".id;


--
-- Name: Pedido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pedido" (
    id integer NOT NULL,
    "negocioId" integer NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado public."PedidoEstado" DEFAULT 'PENDIENTE'::public."PedidoEstado" NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "canalVenta" public."CanalVenta" DEFAULT 'WEB'::public."CanalVenta" NOT NULL,
    "totalSnapshot" numeric(10,2),
    "usuarioId" integer
);


ALTER TABLE public."Pedido" OWNER TO postgres;

--
-- Name: PedidoProducto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PedidoProducto" (
    id integer NOT NULL,
    "pedidoId" integer NOT NULL,
    "productoId" integer NOT NULL,
    cantidad integer NOT NULL,
    "precioUnitario" numeric(10,2) NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "descuentoAplicado" numeric(10,2),
    "promocionId" integer,
    subtotal numeric(10,2) NOT NULL,
    "categoriaIdSnapshot" integer
);


ALTER TABLE public."PedidoProducto" OWNER TO postgres;

--
-- Name: PedidoProducto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."PedidoProducto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PedidoProducto_id_seq" OWNER TO postgres;

--
-- Name: PedidoProducto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."PedidoProducto_id_seq" OWNED BY public."PedidoProducto".id;


--
-- Name: Pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Pedido_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Pedido_id_seq" OWNER TO postgres;

--
-- Name: Pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Pedido_id_seq" OWNED BY public."Pedido".id;


--
-- Name: PetaloTx; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PetaloTx" (
    id integer NOT NULL,
    "usuarioId" integer NOT NULL,
    delta integer NOT NULL,
    motivo public."MotivoTx" NOT NULL,
    "refTipo" text,
    "refId" integer,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    descripcion text,
    metadata jsonb,
    "saldoResultante" integer
);


ALTER TABLE public."PetaloTx" OWNER TO postgres;

--
-- Name: PetaloTx_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."PetaloTx_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PetaloTx_id_seq" OWNER TO postgres;

--
-- Name: PetaloTx_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."PetaloTx_id_seq" OWNED BY public."PetaloTx".id;


--
-- Name: Post; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Post" (
    id integer NOT NULL,
    "usuarioId" integer NOT NULL,
    "negocioId" integer,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "logroId" integer,
    "promocionId" integer,
    "resenaId" integer,
    tipo public."PostTipo" NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "eliminadoEn" timestamp(3) without time zone,
    estado public."ContenidoEstado" DEFAULT 'PUBLICADO'::public."ContenidoEstado" NOT NULL,
    "moderadoEn" timestamp(3) without time zone,
    "motivoModeracion" text,
    CONSTRAINT "Post_tipo_single_target_chk" CHECK ((((tipo = 'RESENA'::public."PostTipo") AND ("resenaId" IS NOT NULL) AND ("promocionId" IS NULL) AND ("logroId" IS NULL)) OR ((tipo = 'PROMOCION'::public."PostTipo") AND ("resenaId" IS NULL) AND ("promocionId" IS NOT NULL) AND ("logroId" IS NULL)) OR ((tipo = 'LOGRO'::public."PostTipo") AND ("resenaId" IS NULL) AND ("promocionId" IS NULL) AND ("logroId" IS NOT NULL))))
);


ALTER TABLE public."Post" OWNER TO postgres;

--
-- Name: Post_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Post_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Post_id_seq" OWNER TO postgres;

--
-- Name: Post_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Post_id_seq" OWNED BY public."Post".id;


--
-- Name: Producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Producto" (
    id integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    "negocioId" integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "eliminadoEn" timestamp(3) without time zone,
    "codigoSKU" text,
    "stockDisponible" integer DEFAULT 0 NOT NULL,
    "stockReservado" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Producto" OWNER TO postgres;

--
-- Name: Producto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Producto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Producto_id_seq" OWNER TO postgres;

--
-- Name: Producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Producto_id_seq" OWNED BY public."Producto".id;


--
-- Name: Promocion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Promocion" (
    id integer NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    "negocioId" integer NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    descuento numeric(10,2) NOT NULL,
    "fechaCaducidad" timestamp(3) without time zone NOT NULL,
    "productoId" integer,
    activa boolean DEFAULT true NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    codigo text,
    "eliminadoEn" timestamp(3) without time zone,
    estado public."ContenidoEstado" DEFAULT 'PUBLICADO'::public."ContenidoEstado" NOT NULL,
    "fechaInicio" timestamp(3) without time zone,
    "moderadoEn" timestamp(3) without time zone,
    "motivoModeracion" text,
    "stockMaximo" integer,
    "tipoDescuento" public."TipoDescuento" DEFAULT 'PORCENTAJE'::public."TipoDescuento" NOT NULL,
    "usosActuales" integer DEFAULT 0 NOT NULL,
    "usosMaximos" integer
);


ALTER TABLE public."Promocion" OWNER TO postgres;

--
-- Name: Promocion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Promocion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Promocion_id_seq" OWNER TO postgres;

--
-- Name: Promocion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Promocion_id_seq" OWNED BY public."Promocion".id;


--
-- Name: RecursoReserva; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RecursoReserva" (
    id integer NOT NULL,
    "negocioId" integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    capacidad integer,
    activo boolean DEFAULT true NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "eliminadoEn" timestamp(3) without time zone
);


ALTER TABLE public."RecursoReserva" OWNER TO postgres;

--
-- Name: RecursoReserva_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."RecursoReserva_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RecursoReserva_id_seq" OWNER TO postgres;

--
-- Name: RecursoReserva_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."RecursoReserva_id_seq" OWNED BY public."RecursoReserva".id;


--
-- Name: Resena; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Resena" (
    id integer NOT NULL,
    contenido text NOT NULL,
    puntuacion integer NOT NULL,
    "usuarioId" integer NOT NULL,
    "negocioId" integer NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "selloNenufar" boolean DEFAULT false NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "eliminadoEn" timestamp(3) without time zone,
    estado public."ContenidoEstado" DEFAULT 'PUBLICADO'::public."ContenidoEstado" NOT NULL,
    "moderadoEn" timestamp(3) without time zone,
    "motivoModeracion" text
);


ALTER TABLE public."Resena" OWNER TO postgres;

--
-- Name: Resena_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Resena_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Resena_id_seq" OWNER TO postgres;

--
-- Name: Resena_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Resena_id_seq" OWNED BY public."Resena".id;


--
-- Name: Reserva; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Reserva" (
    id integer NOT NULL,
    fecha timestamp(3) without time zone NOT NULL,
    "usuarioId" integer NOT NULL,
    "negocioId" integer NOT NULL,
    nota text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "canceladaEn" timestamp(3) without time zone,
    "duracionMinutos" integer,
    estado public."ReservaEstado" DEFAULT 'PENDIENTE'::public."ReservaEstado" NOT NULL,
    "motivoCancelacion" text,
    "numPersonas" integer,
    "recursoId" integer
);


ALTER TABLE public."Reserva" OWNER TO postgres;

--
-- Name: Reserva_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Reserva_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Reserva_id_seq" OWNER TO postgres;

--
-- Name: Reserva_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Reserva_id_seq" OWNED BY public."Reserva".id;


--
-- Name: Subcategoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Subcategoria" (
    id integer NOT NULL,
    nombre text NOT NULL,
    "categoriaId" integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "eliminadoEn" timestamp(3) without time zone
);


ALTER TABLE public."Subcategoria" OWNER TO postgres;

--
-- Name: Subcategoria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Subcategoria_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Subcategoria_id_seq" OWNER TO postgres;

--
-- Name: Subcategoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Subcategoria_id_seq" OWNED BY public."Subcategoria".id;


--
-- Name: Usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Usuario" (
    id integer NOT NULL,
    nombre text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    foto text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    biografia text,
    nickname text NOT NULL,
    "petalosSaldo" integer DEFAULT 0 NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "eliminadoEn" timestamp(3) without time zone,
    "emailVerificado" boolean DEFAULT false NOT NULL,
    "verificadoEn" timestamp(3) without time zone,
    "ultimoLoginEn" timestamp(3) without time zone,
    "estadoCuenta" public."EstadoCuenta" DEFAULT 'ACTIVA'::public."EstadoCuenta" NOT NULL,
    "rolGlobal" public."RolGlobal" DEFAULT 'USUARIO'::public."RolGlobal" NOT NULL
);


ALTER TABLE public."Usuario" OWNER TO postgres;

--
-- Name: UsuarioSeguimiento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UsuarioSeguimiento" (
    id integer NOT NULL,
    "seguidorId" integer NOT NULL,
    "seguidoId" integer NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UsuarioSeguimiento" OWNER TO postgres;

--
-- Name: UsuarioSeguimiento_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."UsuarioSeguimiento_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."UsuarioSeguimiento_id_seq" OWNER TO postgres;

--
-- Name: UsuarioSeguimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."UsuarioSeguimiento_id_seq" OWNED BY public."UsuarioSeguimiento".id;


--
-- Name: Usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Usuario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Usuario_id_seq" OWNER TO postgres;

--
-- Name: Usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Usuario_id_seq" OWNED BY public."Usuario".id;


--
-- Name: VisitaNegocio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VisitaNegocio" (
    id integer NOT NULL,
    "negocioId" integer NOT NULL,
    "usuarioId" integer,
    origen text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."VisitaNegocio" OWNER TO postgres;

--
-- Name: VisitaNegocio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."VisitaNegocio_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."VisitaNegocio_id_seq" OWNER TO postgres;

--
-- Name: VisitaNegocio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."VisitaNegocio_id_seq" OWNED BY public."VisitaNegocio".id;


--
-- Name: _PromocionPack; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_PromocionPack" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE public."_PromocionPack" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: Categoria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Categoria" ALTER COLUMN id SET DEFAULT nextval('public."Categoria_id_seq"'::regclass);


--
-- Name: Comentario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comentario" ALTER COLUMN id SET DEFAULT nextval('public."Comentario_id_seq"'::regclass);


--
-- Name: Compra id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Compra" ALTER COLUMN id SET DEFAULT nextval('public."Compra_id_seq"'::regclass);


--
-- Name: Like id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Like" ALTER COLUMN id SET DEFAULT nextval('public."Like_id_seq"'::regclass);


--
-- Name: Logro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Logro" ALTER COLUMN id SET DEFAULT nextval('public."Logro_id_seq"'::regclass);


--
-- Name: LogroUsuario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogroUsuario" ALTER COLUMN id SET DEFAULT nextval('public."LogroUsuario_id_seq"'::regclass);


--
-- Name: Negocio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Negocio" ALTER COLUMN id SET DEFAULT nextval('public."Negocio_id_seq"'::regclass);


--
-- Name: NegocioMiembro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NegocioMiembro" ALTER COLUMN id SET DEFAULT nextval('public."NegocioMiembro_id_seq"'::regclass);


--
-- Name: Pago id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago" ALTER COLUMN id SET DEFAULT nextval('public."Pago_id_seq"'::regclass);


--
-- Name: Pedido id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pedido" ALTER COLUMN id SET DEFAULT nextval('public."Pedido_id_seq"'::regclass);


--
-- Name: PedidoProducto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PedidoProducto" ALTER COLUMN id SET DEFAULT nextval('public."PedidoProducto_id_seq"'::regclass);


--
-- Name: PetaloTx id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PetaloTx" ALTER COLUMN id SET DEFAULT nextval('public."PetaloTx_id_seq"'::regclass);


--
-- Name: Post id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Post" ALTER COLUMN id SET DEFAULT nextval('public."Post_id_seq"'::regclass);


--
-- Name: Producto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Producto" ALTER COLUMN id SET DEFAULT nextval('public."Producto_id_seq"'::regclass);


--
-- Name: Promocion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Promocion" ALTER COLUMN id SET DEFAULT nextval('public."Promocion_id_seq"'::regclass);


--
-- Name: RecursoReserva id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RecursoReserva" ALTER COLUMN id SET DEFAULT nextval('public."RecursoReserva_id_seq"'::regclass);


--
-- Name: Resena id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Resena" ALTER COLUMN id SET DEFAULT nextval('public."Resena_id_seq"'::regclass);


--
-- Name: Reserva id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reserva" ALTER COLUMN id SET DEFAULT nextval('public."Reserva_id_seq"'::regclass);


--
-- Name: Subcategoria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subcategoria" ALTER COLUMN id SET DEFAULT nextval('public."Subcategoria_id_seq"'::regclass);


--
-- Name: Usuario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Usuario" ALTER COLUMN id SET DEFAULT nextval('public."Usuario_id_seq"'::regclass);


--
-- Name: UsuarioSeguimiento id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UsuarioSeguimiento" ALTER COLUMN id SET DEFAULT nextval('public."UsuarioSeguimiento_id_seq"'::regclass);


--
-- Name: VisitaNegocio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VisitaNegocio" ALTER COLUMN id SET DEFAULT nextval('public."VisitaNegocio_id_seq"'::regclass);


--
-- Data for Name: Categoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Categoria" (id, nombre, activo, "actualizadoEn", "creadoEn", "eliminadoEn") FROM stdin;
\.


--
-- Data for Name: Comentario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Comentario" (id, contenido, "usuarioId", "postId", "creadoEn", "actualizadoEn", "eliminadoEn", estado, "moderadoEn", "motivoModeracion") FROM stdin;
\.


--
-- Data for Name: Compra; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Compra" (id, "pedidoId", "usuarioId", total, "creadoEn", estado, "negocioId", "actualizadoEn", moneda) FROM stdin;
\.


--
-- Data for Name: Like; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Like" (id, tipo, "usuarioId", "postId", "creadoEn") FROM stdin;
\.


--
-- Data for Name: Logro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Logro" (id, titulo, descripcion, "negocioId", "recompensaPuntos", umbral, "categoriaId", dificultad, "productoId", "subcategoriaId", tipo, "actualizadoEn", "creadoEn") FROM stdin;
\.


--
-- Data for Name: LogroUsuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LogroUsuario" (id, "logroId", "usuarioId", veces, conseguido, "conseguidoEn", "actualizadoEn") FROM stdin;
\.


--
-- Data for Name: Negocio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Negocio" (id, nombre, historia, "fechaFundacion", direccion, "categoriaId", "creadoEn", horario, "intervaloReserva", "duenoId", "subcategoriaId", activo, "actualizadoEn", ciudad, "codigoPostal", "descripcionCorta", "eliminadoEn", "emailContacto", "fotoPerfil", "fotoPortada", instagram, latitud, longitud, provincia, telefono, verificado, web) FROM stdin;
\.


--
-- Data for Name: NegocioMiembro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NegocioMiembro" (id, "negocioId", "usuarioId", rol, "actualizadoEn", "creadoEn") FROM stdin;
\.


--
-- Data for Name: Pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Pago" (id, "compraId", cantidad, "creadoEn", "metodoPago", estado, "usuarioId", "actualizadoEn", moneda, "refExterna") FROM stdin;
\.


--
-- Data for Name: Pedido; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Pedido" (id, "negocioId", "creadoEn", estado, "actualizadoEn", "canalVenta", "totalSnapshot", "usuarioId") FROM stdin;
\.


--
-- Data for Name: PedidoProducto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PedidoProducto" (id, "pedidoId", "productoId", cantidad, "precioUnitario", "actualizadoEn", "creadoEn", "descuentoAplicado", "promocionId", subtotal, "categoriaIdSnapshot") FROM stdin;
\.


--
-- Data for Name: PetaloTx; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PetaloTx" (id, "usuarioId", delta, motivo, "refTipo", "refId", "creadoEn", descripcion, metadata, "saldoResultante") FROM stdin;
\.


--
-- Data for Name: Post; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Post" (id, "usuarioId", "negocioId", "creadoEn", "logroId", "promocionId", "resenaId", tipo, "actualizadoEn", "eliminadoEn", estado, "moderadoEn", "motivoModeracion") FROM stdin;
\.


--
-- Data for Name: Producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Producto" (id, nombre, descripcion, precio, "negocioId", activo, "actualizadoEn", "creadoEn", "eliminadoEn", "codigoSKU", "stockDisponible", "stockReservado") FROM stdin;
\.


--
-- Data for Name: Promocion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Promocion" (id, titulo, descripcion, "negocioId", "creadoEn", descuento, "fechaCaducidad", "productoId", activa, "actualizadoEn", codigo, "eliminadoEn", estado, "fechaInicio", "moderadoEn", "motivoModeracion", "stockMaximo", "tipoDescuento", "usosActuales", "usosMaximos") FROM stdin;
\.


--
-- Data for Name: RecursoReserva; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RecursoReserva" (id, "negocioId", nombre, descripcion, capacidad, activo, "creadoEn", "actualizadoEn", "eliminadoEn") FROM stdin;
\.


--
-- Data for Name: Resena; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Resena" (id, contenido, puntuacion, "usuarioId", "negocioId", "creadoEn", "selloNenufar", "actualizadoEn", "eliminadoEn", estado, "moderadoEn", "motivoModeracion") FROM stdin;
\.


--
-- Data for Name: Reserva; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Reserva" (id, fecha, "usuarioId", "negocioId", nota, "creadoEn", "actualizadoEn", "canceladaEn", "duracionMinutos", estado, "motivoCancelacion", "numPersonas", "recursoId") FROM stdin;
\.


--
-- Data for Name: Subcategoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Subcategoria" (id, nombre, "categoriaId", activo, "actualizadoEn", "creadoEn", "eliminadoEn") FROM stdin;
\.


--
-- Data for Name: Usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Usuario" (id, nombre, email, password, foto, "creadoEn", biografia, nickname, "petalosSaldo", "actualizadoEn", "eliminadoEn", "emailVerificado", "verificadoEn", "ultimoLoginEn", "estadoCuenta", "rolGlobal") FROM stdin;
\.


--
-- Data for Name: UsuarioSeguimiento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UsuarioSeguimiento" (id, "seguidorId", "seguidoId", "creadoEn") FROM stdin;
\.


--
-- Data for Name: VisitaNegocio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VisitaNegocio" (id, "negocioId", "usuarioId", origen, "creadoEn") FROM stdin;
\.


--
-- Data for Name: _PromocionPack; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_PromocionPack" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
bc996b50-b737-4fd3-b7d8-05a76c33f046	eb42e0e8ad1c385e7535dbc78ca07a41760c70f6def0026c2dc154bba81cd1da	2026-04-27 05:44:57.570358+02	20250611010625_add_tablas_principales_nenufar	\N	\N	2026-04-27 05:44:57.552634+02	1
24f2decf-5b47-4e4d-8031-014b6f6a55b8	abf3bf3f071587d987b1d5d6d4421d6489057f295103037daf838f74d95ae4c0	2026-04-27 05:44:57.630607+02	20260328210300_like_tipo_enum	\N	\N	2026-04-27 05:44:57.627966+02	1
bed49d16-33c7-4c13-b0fa-bf7b2ff3a9c5	37d5d241afa6c90be7cb4607646027592783679b001d4c8e7eb1d2f60e4a38df	2026-04-27 05:44:57.571485+02	20250613000121_add_biografia_al_usuario	\N	\N	2026-04-27 05:44:57.570546+02	1
e266bbdd-e19c-4e28-8dc1-fea60b658257	0713147570466155b4b931dfb219d7c066f40bb9a3c9de6b53c1a9f911f09cd6	2026-04-27 05:44:57.574971+02	20250613010127_cambioaresena	\N	\N	2026-04-27 05:44:57.571733+02	1
1175e607-de10-476a-9f7a-7cb52b7c7334	e9aa0c1d52db15c0959e66e12efeed62ba9d9d73824968769dddd74ac7fa8be8	2026-04-27 05:44:57.734768+02	20260425170955_subcategoria	\N	\N	2026-04-27 05:44:57.707623+02	1
3d3c47b5-8609-42af-93da-afcbb699aeaf	6bd79433e87046cfa815a93f0ecd0a8f56ec86864baf26dadf37cd23129a4e8a	2026-04-27 05:44:57.577991+02	20250614222329_fix_promocion_relations	\N	\N	2026-04-27 05:44:57.575208+02	1
e1176485-bdb9-4f62-a288-ca66009dd446	487480d8dbe6b0942724243ad985942c15118bd8454baaba5a3fa60730f28fbe	2026-04-27 05:44:57.634384+02	20260328210400_compra_unique_pedido_usuario	\N	\N	2026-04-27 05:44:57.630783+02	1
0f88d204-d0eb-4efc-b6fb-c3033b3b39ad	a662b58f7a0033fa09b8a7932e5b64d8f44c0b270107cee6e0a83297f19fc80a	2026-04-27 05:44:57.579422+02	20250616010359_add_usuario_nick	\N	\N	2026-04-27 05:44:57.578149+02	1
cb4c62fc-e0a4-4867-ab5c-56a4a4779953	6851479df87236377d490deee85ca473e0c8608bda0736f83f520d1988bd892a	2026-04-27 05:44:57.580113+02	20250616213329_add_horario_to_negocio	\N	\N	2026-04-27 05:44:57.579607+02	1
05213411-4708-4de1-9466-deb31a548a53	3d440f9def1a35376629bfe90c10cf3f5adf7d4dfbde086dbb47fa06c1e8a991	2026-04-27 05:44:57.58081+02	20250629234838_add_intervalo_reserva	\N	\N	2026-04-27 05:44:57.580269+02	1
d99e4d2c-8303-4b66-9b9d-538955f30a9f	f7134f08218c768efa9b4241ce58d04ba603cebf39e83998eec01c939d9968cb	2026-04-27 05:44:57.636401+02	20260328210500_reserva_unique_negocio_fecha	\N	\N	2026-04-27 05:44:57.634783+02	1
084a5e11-9e97-4db2-af2f-65b46f7ceddd	819273dc8d099855854ed7ee5c257c21c98449381e4602c3c9af5368078e4dd7	2026-04-27 05:44:57.58169+02	20250701071901_add_sello_nenufar	\N	\N	2026-04-27 05:44:57.580985+02	1
328d85d9-9a4a-4e3b-838f-7be91582caa9	0b9dccba31a25795d5be039f3cb74f578522b45647a0d1ee46381ac9c7c0a9f2	2026-04-27 05:44:57.582381+02	20250701081222_eliminar_tipo	\N	\N	2026-04-27 05:44:57.581814+02	1
79b20076-c758-4e80-858e-eb9492e19300	189cf97ee624e47a76b7455a0754577900940c13dae829bad153ff0aaec0f0cb	2026-04-27 05:44:57.603071+02	20250813184604_init_clean	\N	\N	2026-04-27 05:44:57.582614+02	1
b3690ec9-3dca-433e-9351-ac2ec4a84e63	e16bfe2c5e45ac687289d848832a1bd72c7ba3aa90fa6b6c63423f4dec6bf0cc	2026-04-27 05:44:57.683327+02	20260328210600_post_tipo_single_target	\N	\N	2026-04-27 05:44:57.63657+02	1
901ff21c-6a16-42a7-b6dc-78fa4fb6044c	6b25ea7673abe27e8129e6966119db53ae56acffad7462558c4d361d9bac583b	2026-04-27 05:44:57.621926+02	20250815172751_init_v2	\N	\N	2026-04-27 05:44:57.603336+02	1
d80b9dc7-3bdf-4ac3-b961-8de30035ce57	a1ab259145e72b5028441de87ba564526dabb5080fb3babc1ef3053585a09d9f	2026-04-27 05:44:57.624053+02	20260328210100_add_compra_negocio_fk	\N	\N	2026-04-27 05:44:57.622142+02	1
fd824b30-e985-4b82-abb7-88f3b54cf783	d7f1d2c90ea65ad3b26b889f0d2e28db55d89cb6133a5d794f9fc7d555558248	2026-04-27 05:44:57.746039+02	20260426222323_add_recursos_reserva	\N	\N	2026-04-27 05:44:57.735038+02	1
9f8964be-e0f5-47fb-bc4b-cfe393b78683	3b5d9e7b387114810dab0388b7d6b1012f371da6ebede63684d34745088c0602	2026-04-27 05:44:57.627801+02	20260328210200_post_reference_cascades	\N	\N	2026-04-27 05:44:57.624231+02	1
9b4f2480-ad88-4b2f-8db7-2a4f294aa3ec	df57d2f193a38f1202c14caf5f6769c69fc8c85edb21e00bd119618b10556682	2026-04-27 05:44:57.692271+02	20260328210700_petalotx_motivo_enum	\N	\N	2026-04-27 05:44:57.683714+02	1
cf71a25a-3427-46ae-a2a5-515308d5d104	11d6050854d1d23cfe98bc21e78a3c1efaa1c6ed0ed6fc418f7a0633312713ed	2026-04-27 05:44:57.698881+02	20260328210800_add_pago_usuario_fk	\N	\N	2026-04-27 05:44:57.692706+02	1
91816aa9-fe24-4997-b11c-b098e7619750	a89761107c2971f81710414319573ab2ccfae67bc5355f111f994771e0f779e0	\N	20260427023008_nohora	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260427023008_nohora\n\nDatabase error code: 42703\n\nDatabase error:\nERROR: column "welcomeEmailSentAt" of relation "Usuario" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42703), message: "column \\"welcomeEmailSentAt\\" of relation \\"Usuario\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(9322), routine: Some("ATExecDropColumn") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260427023008_nohora"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260427023008_nohora"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	\N	2026-04-27 05:44:57.746237+02	0
27b9cbef-96ee-40ae-8e9b-ea376e7a355d	a495cbdd7b2ed2858145315be3770a01357132cd6f383b327c6657e4d2f6108f	2026-04-27 05:44:57.704335+02	20260328210900_create_negocio_miembro	\N	\N	2026-04-27 05:44:57.69911+02	1
09af1501-ac04-427e-bc56-10f275834f3e	780f557bdf81c0915f195a42db85266fabd55ec57d20c53c186626939cc6a1bb	2026-04-27 05:44:57.707349+02	20260417193000_fix_usuario_columns_for_railway	\N	\N	2026-04-27 05:44:57.704531+02	1
\.


--
-- Name: Categoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Categoria_id_seq"', 1, false);


--
-- Name: Comentario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Comentario_id_seq"', 1, false);


--
-- Name: Compra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Compra_id_seq"', 1, false);


--
-- Name: Like_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Like_id_seq"', 1, false);


--
-- Name: LogroUsuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LogroUsuario_id_seq"', 1, false);


--
-- Name: Logro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Logro_id_seq"', 1, false);


--
-- Name: NegocioMiembro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."NegocioMiembro_id_seq"', 1, false);


--
-- Name: Negocio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Negocio_id_seq"', 1, false);


--
-- Name: Pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Pago_id_seq"', 1, false);


--
-- Name: PedidoProducto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PedidoProducto_id_seq"', 1, false);


--
-- Name: Pedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Pedido_id_seq"', 1, false);


--
-- Name: PetaloTx_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PetaloTx_id_seq"', 1, false);


--
-- Name: Post_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Post_id_seq"', 1, false);


--
-- Name: Producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Producto_id_seq"', 1, false);


--
-- Name: Promocion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Promocion_id_seq"', 1, false);


--
-- Name: RecursoReserva_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."RecursoReserva_id_seq"', 1, false);


--
-- Name: Resena_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Resena_id_seq"', 1, false);


--
-- Name: Reserva_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Reserva_id_seq"', 1, false);


--
-- Name: Subcategoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Subcategoria_id_seq"', 1, false);


--
-- Name: UsuarioSeguimiento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."UsuarioSeguimiento_id_seq"', 1, false);


--
-- Name: Usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Usuario_id_seq"', 1, false);


--
-- Name: VisitaNegocio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."VisitaNegocio_id_seq"', 1, false);


--
-- Name: Categoria Categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Categoria"
    ADD CONSTRAINT "Categoria_pkey" PRIMARY KEY (id);


--
-- Name: Comentario Comentario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comentario"
    ADD CONSTRAINT "Comentario_pkey" PRIMARY KEY (id);


--
-- Name: Compra Compra_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Compra"
    ADD CONSTRAINT "Compra_pkey" PRIMARY KEY (id);


--
-- Name: Like Like_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_pkey" PRIMARY KEY (id);


--
-- Name: LogroUsuario LogroUsuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogroUsuario"
    ADD CONSTRAINT "LogroUsuario_pkey" PRIMARY KEY (id);


--
-- Name: Logro Logro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Logro"
    ADD CONSTRAINT "Logro_pkey" PRIMARY KEY (id);


--
-- Name: NegocioMiembro NegocioMiembro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NegocioMiembro"
    ADD CONSTRAINT "NegocioMiembro_pkey" PRIMARY KEY (id);


--
-- Name: Negocio Negocio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Negocio"
    ADD CONSTRAINT "Negocio_pkey" PRIMARY KEY (id);


--
-- Name: Pago Pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago"
    ADD CONSTRAINT "Pago_pkey" PRIMARY KEY (id);


--
-- Name: PedidoProducto PedidoProducto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PedidoProducto"
    ADD CONSTRAINT "PedidoProducto_pkey" PRIMARY KEY (id);


--
-- Name: Pedido Pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pedido"
    ADD CONSTRAINT "Pedido_pkey" PRIMARY KEY (id);


--
-- Name: PetaloTx PetaloTx_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PetaloTx"
    ADD CONSTRAINT "PetaloTx_pkey" PRIMARY KEY (id);


--
-- Name: Post Post_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_pkey" PRIMARY KEY (id);


--
-- Name: Producto Producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_pkey" PRIMARY KEY (id);


--
-- Name: Promocion Promocion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Promocion"
    ADD CONSTRAINT "Promocion_pkey" PRIMARY KEY (id);


--
-- Name: RecursoReserva RecursoReserva_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RecursoReserva"
    ADD CONSTRAINT "RecursoReserva_pkey" PRIMARY KEY (id);


--
-- Name: Resena Resena_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Resena"
    ADD CONSTRAINT "Resena_pkey" PRIMARY KEY (id);


--
-- Name: Reserva Reserva_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reserva"
    ADD CONSTRAINT "Reserva_pkey" PRIMARY KEY (id);


--
-- Name: Subcategoria Subcategoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subcategoria"
    ADD CONSTRAINT "Subcategoria_pkey" PRIMARY KEY (id);


--
-- Name: UsuarioSeguimiento UsuarioSeguimiento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UsuarioSeguimiento"
    ADD CONSTRAINT "UsuarioSeguimiento_pkey" PRIMARY KEY (id);


--
-- Name: Usuario Usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY (id);


--
-- Name: VisitaNegocio VisitaNegocio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VisitaNegocio"
    ADD CONSTRAINT "VisitaNegocio_pkey" PRIMARY KEY (id);


--
-- Name: _PromocionPack _PromocionPack_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_PromocionPack"
    ADD CONSTRAINT "_PromocionPack_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Categoria_activo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Categoria_activo_idx" ON public."Categoria" USING btree (activo);


--
-- Name: Categoria_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Categoria_nombre_key" ON public."Categoria" USING btree (nombre);


--
-- Name: Comentario_estado_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comentario_estado_idx" ON public."Comentario" USING btree (estado);


--
-- Name: Comentario_postId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comentario_postId_idx" ON public."Comentario" USING btree ("postId");


--
-- Name: Comentario_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comentario_usuarioId_idx" ON public."Comentario" USING btree ("usuarioId");


--
-- Name: Compra_estado_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Compra_estado_creadoEn_idx" ON public."Compra" USING btree (estado, "creadoEn");


--
-- Name: Compra_moneda_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Compra_moneda_idx" ON public."Compra" USING btree (moneda);


--
-- Name: Compra_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Compra_negocioId_idx" ON public."Compra" USING btree ("negocioId");


--
-- Name: Compra_pedidoId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Compra_pedidoId_idx" ON public."Compra" USING btree ("pedidoId");


--
-- Name: Compra_pedidoId_usuarioId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Compra_pedidoId_usuarioId_key" ON public."Compra" USING btree ("pedidoId", "usuarioId");


--
-- Name: Compra_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Compra_usuarioId_idx" ON public."Compra" USING btree ("usuarioId");


--
-- Name: Like_postId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Like_postId_idx" ON public."Like" USING btree ("postId");


--
-- Name: Like_usuarioId_postId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Like_usuarioId_postId_key" ON public."Like" USING btree ("usuarioId", "postId");


--
-- Name: LogroUsuario_conseguido_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LogroUsuario_conseguido_idx" ON public."LogroUsuario" USING btree (conseguido);


--
-- Name: LogroUsuario_logroId_usuarioId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "LogroUsuario_logroId_usuarioId_key" ON public."LogroUsuario" USING btree ("logroId", "usuarioId");


--
-- Name: LogroUsuario_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LogroUsuario_usuarioId_idx" ON public."LogroUsuario" USING btree ("usuarioId");


--
-- Name: Logro_categoriaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Logro_categoriaId_idx" ON public."Logro" USING btree ("categoriaId");


--
-- Name: Logro_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Logro_negocioId_idx" ON public."Logro" USING btree ("negocioId");


--
-- Name: Logro_productoId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Logro_productoId_idx" ON public."Logro" USING btree ("productoId");


--
-- Name: Logro_subcategoriaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Logro_subcategoriaId_idx" ON public."Logro" USING btree ("subcategoriaId");


--
-- Name: Logro_tipo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Logro_tipo_idx" ON public."Logro" USING btree (tipo);


--
-- Name: NegocioMiembro_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "NegocioMiembro_negocioId_idx" ON public."NegocioMiembro" USING btree ("negocioId");


--
-- Name: NegocioMiembro_negocioId_usuarioId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "NegocioMiembro_negocioId_usuarioId_key" ON public."NegocioMiembro" USING btree ("negocioId", "usuarioId");


--
-- Name: NegocioMiembro_rol_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "NegocioMiembro_rol_idx" ON public."NegocioMiembro" USING btree (rol);


--
-- Name: NegocioMiembro_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "NegocioMiembro_usuarioId_idx" ON public."NegocioMiembro" USING btree ("usuarioId");


--
-- Name: Negocio_activo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Negocio_activo_idx" ON public."Negocio" USING btree (activo);


--
-- Name: Negocio_categoriaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Negocio_categoriaId_idx" ON public."Negocio" USING btree ("categoriaId");


--
-- Name: Negocio_ciudad_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Negocio_ciudad_idx" ON public."Negocio" USING btree (ciudad);


--
-- Name: Negocio_duenoId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Negocio_duenoId_idx" ON public."Negocio" USING btree ("duenoId");


--
-- Name: Negocio_subcategoriaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Negocio_subcategoriaId_idx" ON public."Negocio" USING btree ("subcategoriaId");


--
-- Name: Negocio_verificado_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Negocio_verificado_idx" ON public."Negocio" USING btree (verificado);


--
-- Name: Pago_compraId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Pago_compraId_idx" ON public."Pago" USING btree ("compraId");


--
-- Name: Pago_estado_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Pago_estado_creadoEn_idx" ON public."Pago" USING btree (estado, "creadoEn");


--
-- Name: Pago_refExterna_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Pago_refExterna_idx" ON public."Pago" USING btree ("refExterna");


--
-- Name: Pago_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Pago_usuarioId_idx" ON public."Pago" USING btree ("usuarioId");


--
-- Name: PedidoProducto_categoriaIdSnapshot_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PedidoProducto_categoriaIdSnapshot_idx" ON public."PedidoProducto" USING btree ("categoriaIdSnapshot");


--
-- Name: PedidoProducto_pedidoId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PedidoProducto_pedidoId_idx" ON public."PedidoProducto" USING btree ("pedidoId");


--
-- Name: PedidoProducto_pedidoId_productoId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PedidoProducto_pedidoId_productoId_key" ON public."PedidoProducto" USING btree ("pedidoId", "productoId");


--
-- Name: PedidoProducto_productoId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PedidoProducto_productoId_idx" ON public."PedidoProducto" USING btree ("productoId");


--
-- Name: PedidoProducto_promocionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PedidoProducto_promocionId_idx" ON public."PedidoProducto" USING btree ("promocionId");


--
-- Name: Pedido_canalVenta_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Pedido_canalVenta_idx" ON public."Pedido" USING btree ("canalVenta");


--
-- Name: Pedido_estado_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Pedido_estado_creadoEn_idx" ON public."Pedido" USING btree (estado, "creadoEn");


--
-- Name: Pedido_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Pedido_negocioId_idx" ON public."Pedido" USING btree ("negocioId");


--
-- Name: Pedido_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Pedido_usuarioId_idx" ON public."Pedido" USING btree ("usuarioId");


--
-- Name: PetaloTx_refTipo_refId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PetaloTx_refTipo_refId_idx" ON public."PetaloTx" USING btree ("refTipo", "refId");


--
-- Name: PetaloTx_usuarioId_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PetaloTx_usuarioId_creadoEn_idx" ON public."PetaloTx" USING btree ("usuarioId", "creadoEn");


--
-- Name: PetaloTx_usuarioId_motivo_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PetaloTx_usuarioId_motivo_creadoEn_idx" ON public."PetaloTx" USING btree ("usuarioId", motivo, "creadoEn");


--
-- Name: Post_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Post_creadoEn_idx" ON public."Post" USING btree ("creadoEn");


--
-- Name: Post_estado_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Post_estado_idx" ON public."Post" USING btree (estado);


--
-- Name: Post_logroId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Post_logroId_idx" ON public."Post" USING btree ("logroId");


--
-- Name: Post_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Post_negocioId_idx" ON public."Post" USING btree ("negocioId");


--
-- Name: Post_promocionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Post_promocionId_idx" ON public."Post" USING btree ("promocionId");


--
-- Name: Post_resenaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Post_resenaId_idx" ON public."Post" USING btree ("resenaId");


--
-- Name: Post_tipo_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Post_tipo_creadoEn_idx" ON public."Post" USING btree (tipo, "creadoEn");


--
-- Name: Post_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Post_usuarioId_idx" ON public."Post" USING btree ("usuarioId");


--
-- Name: Producto_activo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Producto_activo_idx" ON public."Producto" USING btree (activo);


--
-- Name: Producto_codigoSKU_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Producto_codigoSKU_idx" ON public."Producto" USING btree ("codigoSKU");


--
-- Name: Producto_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Producto_negocioId_idx" ON public."Producto" USING btree ("negocioId");


--
-- Name: Promocion_activa_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Promocion_activa_idx" ON public."Promocion" USING btree (activa);


--
-- Name: Promocion_codigo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Promocion_codigo_idx" ON public."Promocion" USING btree (codigo);


--
-- Name: Promocion_estado_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Promocion_estado_idx" ON public."Promocion" USING btree (estado);


--
-- Name: Promocion_fechaCaducidad_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Promocion_fechaCaducidad_idx" ON public."Promocion" USING btree ("fechaCaducidad");


--
-- Name: Promocion_negocioId_fechaCaducidad_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Promocion_negocioId_fechaCaducidad_idx" ON public."Promocion" USING btree ("negocioId", "fechaCaducidad");


--
-- Name: Promocion_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Promocion_negocioId_idx" ON public."Promocion" USING btree ("negocioId");


--
-- Name: Promocion_productoId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Promocion_productoId_idx" ON public."Promocion" USING btree ("productoId");


--
-- Name: RecursoReserva_activo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RecursoReserva_activo_idx" ON public."RecursoReserva" USING btree (activo);


--
-- Name: RecursoReserva_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RecursoReserva_negocioId_idx" ON public."RecursoReserva" USING btree ("negocioId");


--
-- Name: Resena_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Resena_creadoEn_idx" ON public."Resena" USING btree ("creadoEn");


--
-- Name: Resena_estado_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Resena_estado_idx" ON public."Resena" USING btree (estado);


--
-- Name: Resena_negocioId_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Resena_negocioId_creadoEn_idx" ON public."Resena" USING btree ("negocioId", "creadoEn");


--
-- Name: Resena_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Resena_usuarioId_idx" ON public."Resena" USING btree ("usuarioId");


--
-- Name: Reserva_estado_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reserva_estado_idx" ON public."Reserva" USING btree (estado);


--
-- Name: Reserva_fecha_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reserva_fecha_idx" ON public."Reserva" USING btree (fecha);


--
-- Name: Reserva_negocioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reserva_negocioId_idx" ON public."Reserva" USING btree ("negocioId");


--
-- Name: Reserva_negocioId_recursoId_fecha_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Reserva_negocioId_recursoId_fecha_key" ON public."Reserva" USING btree ("negocioId", "recursoId", fecha);


--
-- Name: Reserva_recursoId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reserva_recursoId_idx" ON public."Reserva" USING btree ("recursoId");


--
-- Name: Reserva_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reserva_usuarioId_idx" ON public."Reserva" USING btree ("usuarioId");


--
-- Name: Subcategoria_activo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Subcategoria_activo_idx" ON public."Subcategoria" USING btree (activo);


--
-- Name: Subcategoria_categoriaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Subcategoria_categoriaId_idx" ON public."Subcategoria" USING btree ("categoriaId");


--
-- Name: Subcategoria_categoriaId_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Subcategoria_categoriaId_nombre_key" ON public."Subcategoria" USING btree ("categoriaId", nombre);


--
-- Name: Subcategoria_nombre_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Subcategoria_nombre_idx" ON public."Subcategoria" USING btree (nombre);


--
-- Name: UsuarioSeguimiento_seguidoId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UsuarioSeguimiento_seguidoId_idx" ON public."UsuarioSeguimiento" USING btree ("seguidoId");


--
-- Name: UsuarioSeguimiento_seguidorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UsuarioSeguimiento_seguidorId_idx" ON public."UsuarioSeguimiento" USING btree ("seguidorId");


--
-- Name: UsuarioSeguimiento_seguidorId_seguidoId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UsuarioSeguimiento_seguidorId_seguidoId_key" ON public."UsuarioSeguimiento" USING btree ("seguidorId", "seguidoId");


--
-- Name: Usuario_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Usuario_creadoEn_idx" ON public."Usuario" USING btree ("creadoEn");


--
-- Name: Usuario_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Usuario_email_key" ON public."Usuario" USING btree (email);


--
-- Name: Usuario_estadoCuenta_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Usuario_estadoCuenta_idx" ON public."Usuario" USING btree ("estadoCuenta");


--
-- Name: Usuario_nickname_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Usuario_nickname_key" ON public."Usuario" USING btree (nickname);


--
-- Name: Usuario_rolGlobal_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Usuario_rolGlobal_idx" ON public."Usuario" USING btree ("rolGlobal");


--
-- Name: VisitaNegocio_negocioId_creadoEn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VisitaNegocio_negocioId_creadoEn_idx" ON public."VisitaNegocio" USING btree ("negocioId", "creadoEn");


--
-- Name: VisitaNegocio_origen_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VisitaNegocio_origen_idx" ON public."VisitaNegocio" USING btree (origen);


--
-- Name: VisitaNegocio_usuarioId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VisitaNegocio_usuarioId_idx" ON public."VisitaNegocio" USING btree ("usuarioId");


--
-- Name: _PromocionPack_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_PromocionPack_B_index" ON public."_PromocionPack" USING btree ("B");


--
-- Name: Comentario Comentario_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comentario"
    ADD CONSTRAINT "Comentario_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comentario Comentario_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comentario"
    ADD CONSTRAINT "Comentario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Compra Compra_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Compra"
    ADD CONSTRAINT "Compra_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Compra Compra_pedidoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Compra"
    ADD CONSTRAINT "Compra_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES public."Pedido"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Compra Compra_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Compra"
    ADD CONSTRAINT "Compra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Like Like_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LogroUsuario LogroUsuario_logroId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogroUsuario"
    ADD CONSTRAINT "LogroUsuario_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES public."Logro"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LogroUsuario LogroUsuario_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogroUsuario"
    ADD CONSTRAINT "LogroUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Logro Logro_categoriaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Logro"
    ADD CONSTRAINT "Logro_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES public."Categoria"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Logro Logro_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Logro"
    ADD CONSTRAINT "Logro_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Logro Logro_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Logro"
    ADD CONSTRAINT "Logro_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Logro Logro_subcategoriaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Logro"
    ADD CONSTRAINT "Logro_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES public."Subcategoria"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: NegocioMiembro NegocioMiembro_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NegocioMiembro"
    ADD CONSTRAINT "NegocioMiembro_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NegocioMiembro NegocioMiembro_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NegocioMiembro"
    ADD CONSTRAINT "NegocioMiembro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Negocio Negocio_categoriaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Negocio"
    ADD CONSTRAINT "Negocio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES public."Categoria"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Negocio Negocio_duenoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Negocio"
    ADD CONSTRAINT "Negocio_duenoId_fkey" FOREIGN KEY ("duenoId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Negocio Negocio_subcategoriaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Negocio"
    ADD CONSTRAINT "Negocio_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES public."Subcategoria"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Pago Pago_compraId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago"
    ADD CONSTRAINT "Pago_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES public."Compra"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Pago Pago_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pago"
    ADD CONSTRAINT "Pago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PedidoProducto PedidoProducto_pedidoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PedidoProducto"
    ADD CONSTRAINT "PedidoProducto_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES public."Pedido"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PedidoProducto PedidoProducto_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PedidoProducto"
    ADD CONSTRAINT "PedidoProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PedidoProducto PedidoProducto_promocionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PedidoProducto"
    ADD CONSTRAINT "PedidoProducto_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES public."Promocion"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Pedido Pedido_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pedido"
    ADD CONSTRAINT "Pedido_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Pedido Pedido_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pedido"
    ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PetaloTx PetaloTx_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PetaloTx"
    ADD CONSTRAINT "PetaloTx_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Post Post_logroId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES public."Logro"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Post Post_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Post Post_promocionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES public."Promocion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Post Post_resenaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_resenaId_fkey" FOREIGN KEY ("resenaId") REFERENCES public."Resena"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Post Post_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Producto Producto_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Promocion Promocion_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Promocion"
    ADD CONSTRAINT "Promocion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Promocion Promocion_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Promocion"
    ADD CONSTRAINT "Promocion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RecursoReserva RecursoReserva_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RecursoReserva"
    ADD CONSTRAINT "RecursoReserva_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Resena Resena_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Resena"
    ADD CONSTRAINT "Resena_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Resena Resena_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Resena"
    ADD CONSTRAINT "Resena_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reserva Reserva_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reserva"
    ADD CONSTRAINT "Reserva_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reserva Reserva_recursoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reserva"
    ADD CONSTRAINT "Reserva_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES public."RecursoReserva"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reserva Reserva_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reserva"
    ADD CONSTRAINT "Reserva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Subcategoria Subcategoria_categoriaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subcategoria"
    ADD CONSTRAINT "Subcategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES public."Categoria"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UsuarioSeguimiento UsuarioSeguimiento_seguidoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UsuarioSeguimiento"
    ADD CONSTRAINT "UsuarioSeguimiento_seguidoId_fkey" FOREIGN KEY ("seguidoId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UsuarioSeguimiento UsuarioSeguimiento_seguidorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UsuarioSeguimiento"
    ADD CONSTRAINT "UsuarioSeguimiento_seguidorId_fkey" FOREIGN KEY ("seguidorId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VisitaNegocio VisitaNegocio_negocioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VisitaNegocio"
    ADD CONSTRAINT "VisitaNegocio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES public."Negocio"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VisitaNegocio VisitaNegocio_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VisitaNegocio"
    ADD CONSTRAINT "VisitaNegocio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _PromocionPack _PromocionPack_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_PromocionPack"
    ADD CONSTRAINT "_PromocionPack_A_fkey" FOREIGN KEY ("A") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PromocionPack _PromocionPack_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_PromocionPack"
    ADD CONSTRAINT "_PromocionPack_B_fkey" FOREIGN KEY ("B") REFERENCES public."Promocion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict SFHuLkUS6IUfThgBKC4iWOHG6t58ZgHCe3bFAIaKU0PIp5Ok9N9ymyP7WZfZtVR

