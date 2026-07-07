import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">iCell ERP</h1>
        <p className="mt-4 text-lg text-gray-600">
          Sistema ERP para lojas de celular
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/auth/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Entrar
          </Link>
          <Link
            href="/auth/cadastro"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-100"
          >
            Cadastrar Loja
          </Link>
        </div>
      </div>
    </main>
  );
}
