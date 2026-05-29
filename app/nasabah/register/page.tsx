import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import RegisterForm from "@/components/nasabah/register-form";

export default function RegisterNasabahPage() {
  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/nasabah" />

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Breadcrumb + Page Title */}
            <div>
              <nav className="flex text-sm text-neutral-500 mb-2">
                <ol className="inline-flex items-center gap-1">
                  <li>
                    <a href="/nasabah" className="hover:text-primary transition-colors font-medium">
                      Manajemen Nasabah
                    </a>
                  </li>
                  <li className="flex items-center">
                    <span className="material-symbols-outlined text-sm mx-1">chevron_right</span>
                    <span className="text-neutral-900 font-medium">Pendaftaran Baru</span>
                  </li>
                </ol>
              </nav>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
                Pendaftaran Nasabah Baru
              </h2>
              <p className="text-neutral-500 mt-1 text-sm md:text-base">
                Lengkapi form di bawah ini untuk mendaftarkan nasabah tabungan haji BSI.
              </p>
            </div>

            {/* Form Card */}
            <RegisterForm />

          </div>

          {/* Page Footer */}
          <footer className="mt-12 border-t border-neutral-200 pt-6 pb-2 text-center">
            <p className="text-sm text-neutral-500">
              © 2024 Bank Syariah Indonesia. Hak Cipta Dilindungi.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
