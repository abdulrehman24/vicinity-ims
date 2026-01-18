<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;

use App\Http\Controllers\SecurityController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\SupportTicketController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin', function () {
    if (!Auth::check()) {
        return redirect('/');
    }

    if (Auth::user()->is_admin >= 2) {
        return redirect('/admin/categories');
    }

    return redirect('/');
});

Route::view('/inventory', 'welcome');
Route::view('/calendar', 'welcome');
Route::view('/stock-take', 'welcome');
Route::view('/report', 'welcome');
Route::view('/records', 'welcome');
Route::view('/dashboard', 'welcome');
Route::view('/admin/{any}', 'welcome')->where('any', '.*');
Route::view('/login', 'welcome');
Route::view('/check-in-out', 'welcome');

Route::post('/login', [AuthController::class, 'login'])->name('login');

Route::get('/auth/google', [AuthController::class, 'redirectToGoogle'])->name('auth.google');
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);
Route::post('/logout', function () {
    Auth::logout();
    return redirect('/');
})->name('logout');

Route::middleware(['auth'])->group(function () {
    Route::post('/security/validate-pin', [SecurityController::class, 'validatePin']);
    Route::post('/security/verify-otp', [SecurityController::class, 'verifyOtp']);
    
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::post('/bookings/return', [BookingController::class, 'returnItems']);
    Route::post('/support-tickets', [SupportTicketController::class, 'store']);
});

Route::resource('equipment', EquipmentController::class);

Route::get('/api/login-settings', [SettingController::class, 'publicLoginSettings']);

Route::middleware(['auth'])->prefix('api/admin')->group(function () {
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
    Route::get('/login-settings', [SettingController::class, 'showLoginSettings']);
    Route::post('/login-settings', [SettingController::class, 'updateLoginSettings']);
    Route::get('/support-tickets', [SupportTicketController::class, 'index']);
    Route::patch('/support-tickets/{ticket}/status', [SupportTicketController::class, 'updateStatus']);
    Route::get('/users', [UserController::class, 'index']);
    Route::patch('/users/{user}/role', [UserController::class, 'updateRole']);
});
