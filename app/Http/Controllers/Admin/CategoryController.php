<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
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

        $query = Category::query();

        $search = $request->input('search');
        if (is_array($search)) {
            $search = $search['value'] ?? null;
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        $length = (int) $request->input('length', 10);
        if ($length <= 0) {
            $length = 10;
        }

        $page = (int) $request->input('page', 1);
        if ($page <= 0) {
            $page = 1;
        }

        $total = $query->count();

        $categories = $query
            ->orderBy('name')
            ->skip(($page - 1) * $length)
            ->take($length)
            ->get();

        return response()->json([
            'data' => $categories,
            'recordsTotal' => $total,
            'recordsFiltered' => $total,
        ]);
    }

    public function store(Request $request)
    {
        $this->ensureSuperAdmin();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'data' => $category,
        ], 201);
    }

    public function update(Request $request, Category $category)
    {
        $this->ensureSuperAdmin();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name,'.$category->id],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $category->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? $category->is_active,
        ]);

        return response()->json([
            'data' => $category,
        ]);
    }

    public function destroy(Category $category)
    {
        $this->ensureSuperAdmin();
        $category->delete();

        return response()->json([
            'message' => 'Category deleted',
        ]);
    }
}
