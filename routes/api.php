<?php

use App\Http\Controllers\CalendarController;
use Illuminate\Support\Facades\Route;

Route::get('/calendar/feed', [CalendarController::class, 'feed']);
