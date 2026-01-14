<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;

use App\Http\Controllers\SecurityController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\BookingController;

Route::get('/', function () {
    return view('welcome');
});

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
});

Route::resource('equipment', EquipmentController::class);

// Catch-all route for React SPA (must be last)
Route::view('/{any}', 'welcome')->where('any', '.*');
