import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl shadow-lg shadow-blue-500/25">
          📱
        </div>
        <h1 className="mt-6 text-3xl font-bold text-gray-900 md:text-4xl">
          iCell ERP
        </h1>
        <p className="mt-3 text-base text-gray-500 md:text-lg">
          Sistema ERP para lojas de celular
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/auth/login"
            className="rounded-xl bg-blue-600 px-8 py-3.5 text-center text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Entrar
          </Link>
          <Link
            href="/auth/cadastro"
            className="rounded-xl border-2 border-gray-200 bg-white px-8 py-3.5 text-center text-base font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Cadastrar Loja
          </Link>
        </div>
      </div>
    </main>
  );
}
