<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CalendarController;

Route::get('/calendar/feed', [CalendarController::class, 'feed']);
