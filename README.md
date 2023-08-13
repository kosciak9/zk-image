# `zk-image`

Small CLI tool that creates a folder with images and DB for it. Also returns a JSON serialized
list of images based on search term. Used for zettelkasten notes, best with
`zk` and `telescope.nvim` integration.

## Usage

```sh
$ zk-image insert ./yellow-submarine.png --description "Yellow submarine"

$ ls ./notes/images

jej2x.png db.sqlite

$ zk-image search yellow

List of images:
"Yellow submarine" - jej2x.png

$ zk-image search yellow --json

[
    {
        id: "jej2x",
        description: "Yellow submarine"
    }
]
```

## Why?

[Full reasoning and idea in a blog post.](https://example.org)
