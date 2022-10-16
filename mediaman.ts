import localForage, { key } from "localforage";
import reflectMetadata from "reflect-metadata";
import {
	classToPlain,
	plainToClassFromExist,
	Expose,
	Type,
} from "class-transformer";

enum Genre {
	Horror = "Horror",
	Fantasic = "Fantasic",
	Thriller = "Thriller",
	Romance = "Romance",
	Fiction = "Fiction",
	genreKey = "genreKey",
}

abstract class Media {
	private _identifier: string;

	protected constructor(
		private _name: string,
		private _description: string,
		private _pictureLocation: string,
		private _genre: Genre,
		identifier?: string
	) {
		if (identifier) {
			this._identifier = identifier;
		} else {
			// using uuid instead
			this._identifier = Math.random().toString(36).substr(2, 9);
		}
	}

	@Expose()
	get identifier(): string {
		return this._identifier;
	}

	set identifier(identifier: string) {
		this._identifier = identifier;
	}

	@Expose()
	get name(): string {
		return this.name;
	}

	set name(name: string) {
		this._name = name;
	}

	@Expose()
	get description(): string {
		return this._description;
	}

	set description(description: string) {
		this._description = description;
	}

	@Expose()
	get pictureLocation(): string {
		return this._pictureLocation;
	}

	set pictureLocation(pictureLocation: string) {
		this._pictureLocation = pictureLocation;
	}

	@Expose()
	get genre(): Genre {
		return this._genre;
	}

	set genre(genre: Genre) {
		this._genre = genre;
	}
}

class Book extends Media {
	private _author: string;
	private _numberOfPages: number;

	constructor(
		name: string,
		description: string,
		pictureLocation: string,
		genre: Genre,
		author: string,
		numberOfPages: number,
		identifier?: string
	) {
		super(name, description, pictureLocation, genre, identifier);
		this._numberOfPages = numberOfPages;
		this._author = author;
	}

	@Expose()
	get author(): string {
		return this._author;
	}

	set author(author: string) {
		this._author = author;
	}

	@Expose()
	@Type(() => Number)
	get numberOfPgaes(): number {
		return this._numberOfPages;
	}

	set numberOfPgaes(numberOfPages: number) {
		this._numberOfPages = numberOfPages;
	}
}

class Movie extends Media {
	private _duration: string;
	private _director: string;

	constructor(
		name: string,
		description: string,
		pictureLocation: string,
		genre: Genre,
		duration: string,
		director: string,
		identifier?: string
	) {
		super(name, description, pictureLocation, genre, identifier);
		this._duration = duration;
		this._director = director;
	}

	@Expose()
	get director(): string {
		return this._director;
	}

	set director(director: string) {
		this._director = director;
	}

	@Expose()
	get duration(): string {
		return this._duration;
	}

	set duration(duration: string) {
		this._duration = duration;
	}
}

class MediaCollection<T extends Media> {
	private _identifier: string;
	private _name: string = "";
	private _collection: ReadonlyArray<T> = [];
	private readonly _type: Function;

	constructor(type: Function, name?: string, identifier?: string) {
		this._type = type;

		if (name) {
			this._name = name;
		}

		if (identifier) {
			this._identifier = identifier;
		} else {
			this._identifier = Math.random().toString(36).substr(2, 9);
		}
	}

	@Expose()
	get identifier(): string {
		return this._identifier;
	}

	set identifier(identifier: string) {
		this._identifier = identifier;
	}

	@Expose()
	get name(): string {
		return this._name;
	}

	set name(name: string) {
		this._name = name;
	}

	@Expose()
	@Type((options) => {
		if (options) {
			return (options.newObject as MediaCollection<T>)._type;
		} else {
			throw new Error(
				"Cannot detemine the type because the options object is null or undefined"
			);
		}
	})
	get collection(): ReadonlyArray<T> {
		return this._collection;
	}

	set collection(collection: ReadonlyArray<T>) {
		this._collection = collection;
	}

	addMedia(media: Readonly<T>): void {
		if (media) {
			this._collection = this._collection.concat(media);
		}
	}

	reomveMedia(itemId: string) {
		if (itemId) {
			this._collection = this._collection.filter(
				(item) => item.identifier !== itemId
			);
		}
	}
}

interface MediaService<T extends Media> {
	loadMediaCollection(identifier: string): Promise<MediaCollection<T>>;
	saveMediaCollection(collection: Readonly<MediaCollection<T>>): Promise<void>;
	getMediaCollectionIdentifierList(): Promise<string[]>;
	removeMediaCollection(identifier: string): Promise<void>;
}

class MeidaServiceImpl<T extends Media> implements MediaService<T> {
	private readonly _store: LocalForage;

	constructor(private _type: Function) {
		console.log(`Initializing media service for ${_type.name}`);

		// each instance of the media service has its own data store:
		//github.com/localForage/localForage
		// the initialization options are described here:
		//localforage.github.io/localForage/#settings-api-config

		this._store = localForage.createInstance({
			name: "MediaMan",
			version: 1.0,
			storeName: `media-man-${_type.name}`,
			description: "MeidaMan data store",
		});
	}

	loadMediaCollection(identifier: string): Promise<MediaCollection<T>> {
		return new Promise<MediaCollection<T>>((resolve, reject) => {
			this._store
				.getItem(identifier)
				.then((value) => {
					console.log("Found the collection: ", value);
					const retrievedCollection = plainToClassFromExist<
						MediaCollection<T>,
						any
					>(new MediaCollection<T>(this._type), value);
					console.log("Retrieved collection: ", retrievedCollection);

					resolve(retrievedCollection);
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	saveMediaCollection(collection: Readonly<MediaCollection<T>>): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (!collection) {
				reject(new Error("The list cannot be null or undefined"));
			}

			console.log(
				`Saving media collection with the following name ${collection.name}`
			);

			// serialization class to JSON
			const serializedVersion = classToPlain(collection, {
				excludePrefixes: ["_"],
			});

			console.log("Serialized Version: ", serializedVersion);

			this._store
				.setItem(collection.identifier, serializedVersion)
				.then((value) => {
					console.log(
						`Saved the ${collection.name} collection successfully! Saved value: ${value}`
					);
					resolve();
				})
				.catch((err) => {
					console.error(`Failed to save the ${collection.name} 
					collection with identifier 
					${collection.identifier}. Error: ${err}`);
					reject(err);
				});
		});
	}

	getMediaCollectionIdentifierList(): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			this._store
				.keys()
				.then((keys) => {
					resolve(keys);
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	removeMediaCollection(identifier: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (!identifier || "" === identifier.trim()) {
				reject(new Error("The identifier must be provided!"));
			}
			console.log(`Removing media collection with the following 
			identifier ${identifier}`);

			this._store
				.removeItem(identifier)
				.then(() => {
					console.log(`Removed the ${identifier} collection 
					successfully!`);
					resolve();
				})
				.catch((err) => {
					console.error(`Failed to removed the ${identifier} 
					collection`);
					reject(err);
				});
		});
	}
}

interface MediaManView {
	getNewBookCollectionName(): string;
	renderBookCollction(bookCollection: Readonly<MediaCollection<Book>>): void;
	displayErrorMessage(message: string): void;
	clearBookCollection(): void;
	removeBookCollection(identifier: string): void;
	getNewBookDetails(collectionIdentifier: string): {
		error?: string;
		book?: Readonly<Book>;
	};
	renderBook(collectionIdentifier: string, book: Readonly<Book>): void;
	removeBook(collectionIdentifier: string, bookIdentifier: string): void;
	clearNewBookCollectionForm(collectionIdentifier: string): void;
}

class HTMLMediaManView implements MediaManView {
	private readonly _newBookCollectionForm: HTMLFormElement;
	private readonly _newBookCollectionName: HTMLInputElement;
	private readonly _bookCollectionsContainer: HTMLDivElement;

	private readonly _genreOptions: string = "";

	constructor() {
		this._newBookCollectionForm = document.getElementById(
			"newBookCollection"
		) as HTMLFormElement;
		this._newBookCollectionName = document.getElementById(
			"newBookCollectionName"
		) as HTMLInputElement;
		this._bookCollectionsContainer = document.getElementById(
			"bookCollections"
		) as HTMLDivElement;

		if (!this._newBookCollectionForm) {
			throw new Error(
				"Could not initialize the view. The 'newBookCollection' element id was not found. Was the template changed?"
			);
		}

		if (!this._newBookCollectionName) {
			throw new Error(
				"Could not initialize the view. The 'newBookCollectionName' element id was not found. Was the template changed?"
			);
		}

		if (!this._bookCollectionsContainer) {
			throw new Error(
				"Could not initialize the view. The 'bookCollections' element id was not found. Was the template changed?"
			);
		}

		for (let genreKey in Genre) {
			this._genreOptions += `<option 
            value="${genreKey}">${Genre.genreKey}</option>">`;
		}
	}

	getNewBookCollectionName(): string {
		if (this._newBookCollectionName.checkValidity() === false) {
			this._newBookCollectionName.reportValidity();
			throw new Error("Invalid collection name!");
		}
		return this._newBookCollectionName.value;
	}

	clearNewBookCollectionForm(): void {
		this._newBookCollectionForm.reset();
	}

	renderBookCollection(bookCollection: Readonly<MediaCollection<Book>>): void {
		this._bookCollectionsContainer.innerHTML += ` 
			<div id="bookCollection-${bookCollection.identifier}" 
			class="collection"> 
				<h3 class="collectionName">${bookCollection.name}</h3> 
		
				<div class="containerGroup"> 
					<div class="container"> 
						<h3>New book</h3> 
		
						<form id="newBook-${bookCollection.identifier}" 
						action="#"> 
							<ul> 
								<li> 
									<input 
									id="newBookName-$
									{bookCollection.identifier}" type="text" 
									title="Name" placeholder="Name" required> 
									<input id="newBookAuthor-$
									{bookCollection.identifier}" 
									type="text" placeholder="Author" required> 
								</li> 
								<li> 
									<select id="newBookGenre-
									${bookCollection.identifier}" required> 
									${this._genreOptions} 
									</select> 
									<input id="newBookPages-$
									{bookCollection.identifier}" 
									type="number" placeholder="Pages"
									required> 
								</li> 
								<li> 
									<input id="newBookPicture-
									${bookCollection.identifier}" type="url" 
									title="Picture" placeholder="Picture URL"> 
								</li> 
								<li> 
									<textarea id="newBookDescription-
									${bookCollection.identifier}" 
									placeholder="Description"></textarea> 
								</li> 
							</ul> 
							<input type="button" value="Create" 
							onclick="mediaManController.
						createBook('${bookCollection.identifier}');" /> 
						</form> 
					</div> 
					<div class="collectionToolsContainer"> 
						<h3>Tools</h3> 
						<form action="#"> 
							<input type="button" value="Remove collection" 
							onclick="mediaManController.removeBookCollection
						('${bookCollection.identifier}');" /> 
						</form> 
					</div> 
				</div> 
		
				<div class="containerGroup"> 
					<div class="container"> 
						<table class="collectionTable"> 
							<thead> 
							<tr> 
								<td>Picture</td> 
								<td>Name</td> 
								<td>Genre</td> 
								<td>Description</td> 
								<td>Author</td> 
								<td>Pages</td> 
								<td>Remove</td> 
							</tr> 
							</thead> 
							<tbody id="collectionTableBody-
							${bookCollection.identifier}"></tbody> 
						</table> 
					</div> 
				</div> 
			</div> 
			`;

		bookCollection.collection.forEach((book) => {
			this.renderBook(bookCollection.identifier, book);
		});
	}

	displayErrorMessage(errorMessage: string): void {
		if (!errorMessage) {
			throw new Error("An error message must be provided!");
		}
		alert(errorMessage);
	}

	clearBookCollections(): void {
		this._bookCollectionsContainer.innerHTML = "";
	}

	removeBookCollection(identifier: string): void {
		const bookCollectionDOMNode: HTMLDivElement = document.getElementById(
			`bookCollection-${identifier}`
		) as HTMLDivElement;
		if (!bookCollectionDOMNode) {
			throw new Error(
				"Could not remove the book collection from the DOM. Couldn't find the DOM node"
			);
		} else {
			bookCollectionDOMNode.remove();
		}
	}

	getNewBookDetails(collectionIdentifier: string): {
		error?: string;
		book?: Book;
	} {
		if (!collectionIdentifier) {
			// we throw this one because it means that there is a bug!
			throw new Error("The collection identifier must be provided!");
		}
		// required
		const newBookForm = document.getElementById(`newBook-$
		{collectionIdentifier}`) as HTMLFormElement;

		if (!newBookForm) {
			throw new Error(`Could not find the new book form for 
			collection ${collectionIdentifier}`);
		}
		// build upon standard HTML DOM validation
		if (newBookForm.checkValidity() === false) {
			newBookForm.reportValidity();
			return {
				error: "The new book form is invalid!",
			};
		}
		// Continue here
		// from here on out, no need to check the validity of the specific
		//form fields
		// we just need to check if the fields can be found
		const newBookNameField = document.getElementById(`newBookName-$
    {collectionIdentifier}`) as HTMLInputElement;
		if (!newBookNameField) {
			throw new Error(
				"The new book form's name input was not found! Did the template change?"
			);
		}
		const newBookAuthorField = document.getElementById(
			`newBookAuthor-${collectionIdentifier}`
		) as HTMLInputElement;
		if (!newBookAuthorField) {
			throw new Error(
				"The new book form's author input was not found! Did the template change?"
			);
		}
		const newBookGenreSelect = document.getElementById(
			`newBookGenre-${collectionIdentifier}`
		) as HTMLSelectElement;
		if (!newBookGenreSelect) {
			throw new Error(
				"The new book form's genre select was not found! Did the template change?"
			);
		}
		const newBookPagesField = document.getElementById(`newBookPages-
    ${collectionIdentifier}`) as HTMLInputElement;
		if (!newBookPagesField) {
			throw new Error(
				"The new book form's page input was not found! Did the template change?"
			);
		}

		// optional
		const newBookPictureField = document.getElementById(
			`newBookPicture-${collectionIdentifier}`
		) as HTMLInputElement;
		if (!newBookPictureField) {
			throw new Error(
				"The new book form's picture input was not found! Did the template change?"
			);
		}
		const newBookDescriptionField = document.getElementById(
			`newBookDescription-${collectionIdentifier}`
		) as HTMLTextAreaElement;
		if (!newBookDescriptionField) {
			throw new Error(
				"The new book form's description input was not found! Did the template change?"
			);
		}

		// Continue here
		const newBookGenre = Genre[newBookGenreSelect.value as keyof typeof Genre];

		const newBookNumberOfPages = Number.parseInt(newBookPagesField.value);

		return {
			book: new Book(
				newBookNameField.value,
				newBookDescriptionField.value,
				newBookPictureField.value,
				newBookGenre,
				newBookAuthorField.value,
				newBookNumberOfPages
			),
		};
	}

	renderBook(collectionIdentifier: string, book: Readonly<Book>): void {
		if (!book) {
			throw new Error("The book to render must be provided!");
		}

		const collectionTableBody = document.getElementById(
			`collectionTableBody-${collectionIdentifier}`
		) as HTMLTableSectionElement;

		if (!collectionTableBody) {
			throw new Error(`The table body for collection             
			${collectionIdentifier} 
			could not be found! Was the template changed?`);
		}

		const tableRow: HTMLTableRowElement = collectionTableBody.insertRow();

		tableRow.id = `book-${collectionIdentifier}-${book.identifier}`;

		tableRow.innerHTML = ` 
				<td> 
					<img class="mediaImage" src="${book.pictureLocation}"> 
				</td> 
				<td>${book.name}</td> 
				<td>${book.genre}</td> 
				<td>${book.description}</td> 
				<td>${book.author}</td> 
				<td>${book.numberOfPgaes}</td> 
				<td> 
					<a href="#" onclick="mediaManController.removeBook
				  ('${collectionIdentifier}','${book.identifier}');">X</a> 
				</td> 
		`;

		collectionTableBody.appendChild(tableRow);
	}

	removeBook(collectionIdentifier: string, bookIdentifier: string): void {
		if (!collectionIdentifier) {
			throw new Error("The collection identifier must be provided!");
		}

		if (!bookIdentifier) {
			throw new Error("The book identifier must be provided!");
		}

		const bookElement = document.getElementById(
			`book-${collectionIdentifier}-${bookIdentifier}`
		) as HTMLInputElement;
		if (!bookElement) {
			throw new Error(
				"The element corresponding to the book to remove could not be found! Did the template change?"
			);
		}

		bookElement.remove();
	}

	clearNewBookForm(collectionIdentifier: string): void {
		if (!collectionIdentifier) {
			throw new Error("The collection identifier must be provided!");
		}

		const newBookForm = document.getElementById(
			`newBook-${collectionIdentifier}`
		) as HTMLFormElement;

		if (!newBookForm) {
			throw new Error(`Could not find the new book form for 
			collection ${collectionIdentifier}`);
		}

		newBookForm.reset();
	}
}

interface MediaManController {
	createBookCollection(): void;
	reloadBookCollections(): void;
	removeBookCollection(identifier: string): void;
	createBook(collectionIdentifier: string): void;
	removeBook(collectionIdentifier: string, bookIdentifier: string): void;
}
