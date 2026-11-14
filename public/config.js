/**
 * ============================================================
 * SiGuru SD - Konfigurasi Koneksi Database Backend
 * ============================================================
 * File ini memisahkan konfigurasi URL Google Apps Script Web App
 * dari kode utama frontend, sehingga Anda cukup mengubah URL di sini
 * tanpa perlu menyentuh file HTML utama.
 * ============================================================
 */

const APP_CONFIG = {
  // Masukkan URL Google Apps Script Web App (JSON REST API) Anda di sini
  // Didapatkan dari: Apps Script Editor > Deploy > Manage deployments > Web App URL
  // Contoh: 'https://script.google.com/macros/s/AKfycbx.../exec'
  GAS_API_URL: '',

  // Konfigurasi Default Aplikasi
  APP_NAME: 'SiGuru SD',
  VERSION: '1.0.0',
  DEFAULT_SCHOOL: 'SDN Merdeka Belajar 01',
  DEFAULT_CLASS: 'Kelas IV-A (Fase B)',

  // Helper untuk mengecek apakah aplikasi sudah terhubung ke backend online
  isConnected: function () {
    return (
      typeof this.GAS_API_URL === 'string' &&
      this.GAS_API_URL.trim().startsWith('https://script.google.com/macros/s/') &&
      this.GAS_API_URL.trim().endsWith('/exec')
    );
  }
};

// Pasang ke window object agar bisa diakses secara global
window.APP_CONFIG = APP_CONFIG;
