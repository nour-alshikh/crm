<?php

namespace App\Http\Controllers;

use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;

class PostController extends Controller
{
    public function index()
    {
        return response()->json([
            'posts' => PostResource::collection(
                Post::with('user:id,name')->latest()->get()
            ),
        ]);
    }

    public function store(StorePostRequest $request)
    {
        $post = $request->user()->posts()->create($request->validated());
        $post->setRelation('user', $request->user());

        return response()->json(['post' => new PostResource($post)], 201);
    }

    public function update(UpdatePostRequest $request, Post $post)
    {
        $post->update($request->validated());
        $post->loadMissing('user:id,name');

        return response()->json(['post' => new PostResource($post)]);
    }

    public function destroy(Post $post)
    {
        $post->delete();

        return response()->noContent();
    }
}
