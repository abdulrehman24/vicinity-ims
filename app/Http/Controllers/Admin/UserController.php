<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    private function ensureSuperAdmin(): void
    {
        if (! auth()->user() || auth()->user()->is_admin < 2) {
            abort(403);
        }
    }

    public function index(Request $request)
    {
        $this->ensureSuperAdmin();

        $query = User::query()->where('id', '!=', auth()->id())->orderBy('name')->orderBy('email');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        $perPage = (int) $request->input('length', 20);
        if ($perPage <= 0) {
            $perPage = 20;
        }

        $users = $query->select(['id', 'name', 'email', 'is_admin', 'created_at', 'is_approved', 'expires_at'])->paginate($perPage);

        return response()->json($users);
    }

    public function approve(Request $request, User $user)
    {
        $this->ensureSuperAdmin();

        $data = $request->validate([
            'is_approved' => ['required', 'boolean'],
        ]);

        $user->update(['is_approved' => $data['is_approved']]);

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'is_approved' => $user->is_approved,
            'expires_at' => $user->expires_at,
            'created_at' => $user->created_at,
        ]);
    }

    public function updateExpiry(Request $request, User $user)
    {
        $this->ensureSuperAdmin();

        $data = $request->validate([
            'expires_at' => ['nullable', 'date'],
        ]);

        $user->update(['expires_at' => $data['expires_at']]);

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'is_approved' => $user->is_approved,
            'expires_at' => $user->expires_at,
            'created_at' => $user->created_at,
        ]);
    }

    public function updateRole(Request $request, User $user)
    {
        $this->ensureSuperAdmin();

        if ($user->is_admin >= 2 || auth()->id() === $user->id) {
            abort(403);
        }

        $data = $request->validate([
            'is_admin' => ['required', 'integer', 'in:0,1'],
        ]);

        $user->is_admin = $data['is_admin'];
        $user->save();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'created_at' => $user->created_at,
        ]);
    }

    public function destroy(User $user)
    {
        $this->ensureSuperAdmin();

        if ($user->is_admin >= 2 || auth()->id() === $user->id) {
            abort(403, 'Cannot delete yourself or another super admin');
        }

        $user->delete();

        return response()->noContent();
    }
}
